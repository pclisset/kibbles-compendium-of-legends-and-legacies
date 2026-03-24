const MODULE_PATH = "modules/kibbles-compendium-of-legends-and-legacies"

Hooks.once("init", () => {
  // Add new class feature types for validation
  foundry.utils.mergeObject(CONFIG.DND5E.featureTypes.class.subtypes, {
    cultistBoon: "KCLL.CultistBoon",
    occultistRite: "KCLL.OccultistRite",
    spellbladeAegis: "KCLL.SpellbladeAegis",
    primalManifestation: "KCLL.PrimalManifestation",
    mysticTechnique: "KCLL.MysticTechnique"
  });

  CONFIG.DND5E.itemProperties.bloodMagic = {
    label: "KCLL.BloodMagic.Label",
    abbreviation: "KCLL.BloodMagic.Abbreviation",
    reference: "Compendium.kibbles-compendium-of-legends-and-legacies.kcll-journals.JournalEntry.NXibCQQFLkrAGE1i.JournalEntryPage.7fVrfxPp9OykJ5OS"
  }
  CONFIG.DND5E.validProperties.spell.add("bloodMagic");

  CONFIG.DND5E.conditionTypes.dazed = {
    name: "KCLL.Dazed",
    img: `${MODULE_PATH}/assets/icons/dazed.svg`,
    id: "dazed",
    _id: dnd5e.utils.staticID("dnd5edazed"),
    reference: "Compendium.kibbles-compendium-of-legends-and-legacies.kcll-journals.JournalEntry.NXibCQQFLkrAGE1i.JournalEntryPage.8t64sXFlxtCVP3b1",
  };

  // Register the Mystic Bulwark AC calculation mode.
  CONFIG.DND5E.armorClasses.wardenMysticBulwark = {
    label: "KCLL.ArmorClassMysticBulwark",
    formula: "@flags.kibbles-compendium-of-legends-and-legacies.mysticBulwarkAC"
  };
});



const MODULE_ID = "kibbles-compendium-of-legends-and-legacies";
// Die progression table, capped at d12 per module policy.
const KCLL_DIE_PROGRESSION = [4, 6, 8, 10, 12];

/**
 * Given a base denomination and an upgrade count, returns the final
 * denomination integer (not a die string). Capped at 12
 */
function _upgradedDenomination(baseDenom, upgrades) {
  const startIdx = KCLL_DIE_PROGRESSION.indexOf(baseDenom);
  if (startIdx === -1) return baseDenom; // unknown base, pass through
  const finalIdx = Math.min(startIdx + upgrades, KCLL_DIE_PROGRESSION.length - 1);
  return KCLL_DIE_PROGRESSION[finalIdx];
}

async function _syncNaturalWeaponDieFlags(actor) {
  if (!["character", "npc"].includes(actor.type)) return;

  const upgrades = Math.max(0, Math.floor(
    actor.system?.scale?.warden?.['natural-weapon-upgrades'] ?? 0
  ));

  const updates = {};
  for (const base of [4, 6, 8]) {
    const key = `naturalWeaponDie${base}`;
    const newVal = _upgradedDenomination(base, upgrades);
    const current = actor.getFlag(MODULE_ID, key);
    if (current !== newVal) updates[key] = newVal;
  }

  // Split-damage advancing die.
  const splitKey = "naturalWeaponDie4Minus1";
  const splitVal = _upgradedDenomination(4, Math.max(0, upgrades - 1));
  const splitCurrent = actor.getFlag(MODULE_ID, splitKey);
  if (splitCurrent !== splitVal) updates[splitKey] = splitVal;

  if (Object.keys(updates).length === 0) return;

  // setFlag one key at a time to avoid flag-merge conflict.
  for (const [key, val] of Object.entries(updates)) {
    await actor.setFlag(MODULE_ID, key, val);
  }
}

/**
 * Calculates the mystic bulwark AC
 */
async function _syncMysticBulwarkACFlag(actor) {
  // Only process player characters and NPCs, not vehicles etc.
  if (!["character", "npc"].includes(actor.type)) return;

  const equippedArmor = actor.items.find(item =>
    item.type === "equipment" &&
    item.system.equipped === true &&
    ["light", "medium", "heavy"].includes(item.system.type?.value)
  );

  // use 99 for null dex cap so min() never restricts stat modifier
  const armorBase = equippedArmor?.system.armor.value ?? 10;
  const maxDex = equippedArmor?.system.armor.dex ?? 99;
  const wisModCapped = Math.min(actor.system.abilities.wis.mod, maxDex);

  const mysticBulwarkAC = armorBase + wisModCapped;

  // Avoid redundant writes to prevent re-trigger
  const current = actor.getFlag(MODULE_ID, "mysticBulwarkAC");
  if (current === mysticBulwarkAC) return;

  await actor.setFlag(MODULE_ID, "mysticBulwarkAC", mysticBulwarkAC);
}

/**
 * Sync all KCLL-managed flags for a given actor.
 */
async function _syncActorFlags(actor) {
  await _syncMysticBulwarkACFlag(actor);
  await _syncNaturalWeaponDieFlags(actor);
}

// Sync mysticBulwarkAC & NaturalWeaponDieFlags on actor update.
Hooks.on("updateActor", (actor, _changes, _options, _userId) => {
  _syncActorFlags(actor);
});

//  Sync mysticBulwarkAC when equipping/unequipping armor
Hooks.on("createItem", (item, _options, _userId) => {
  if (item.parent instanceof Actor) _syncActorFlags(item.parent);
});

Hooks.on("updateItem", (item, _changes, _options, _userId) => {
  if (item.parent instanceof Actor) _syncActorFlags(item.parent);
});

Hooks.on("deleteItem", (item, _options, _userId) => {
  if (item.parent instanceof Actor) _syncActorFlags(item.parent);
});

// Sync mysticBulwarkAC & NaturalWeaponDieFlags on world load
Hooks.once("ready", () => {
  for (const actor of game.actors) {
    _syncActorFlags(actor);
  }
});
