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

  // Register the natural weapon die upgrade helper for Warden
  const KCLL_DIE_PROGRESSION = [4, 6, 8, 10, 12];
  CONFIG.Dice.functions.kcllUpgradeDie = function(baseDenom, upgrades) {
    const base = Number(baseDenom);
    const steps = Math.max(0, Math.floor(Number(upgrades)));
    const startIdx = KCLL_DIE_PROGRESSION.indexOf(base);
    if (startIdx === -1) return `1d${base}`; // unknown base, return as-is
    const finalIdx = Math.min(startIdx + steps, KCLL_DIE_PROGRESSION.length - 1);
    return `1d${KCLL_DIE_PROGRESSION[finalIdx]}`;
  };

  // Register the Mystic Bulwark AC calculation mode.
  CONFIG.DND5E.armorClasses.wardenMysticBulwark = {
    label: "KCLL.ArmorClassMysticBulwark",
    formula: "@attributes.ac.armor + @flags.kibbles-compendium-of-legends-and-legacies.acWis)"
  };
});

/**
 * Calculates the maximum possible wisdeom bonus to AC and adds to roll data as
 * @flags.KCLL.acWis. Needed for the Warden's mystical bulwark AC calculation.
 */

const MODULE_ID = "kibbles-compendium-of-legends-and-legacies";

async function _syncACWisFlag(actor) {
  // Only process player characters and NPCs, not vehicles etc.
  if (!["character", "npc"].includes(actor.type)) return;

  const equippedArmor = actor.items.find(item =>
    item.type === "equipment" &&
    item.system.equipped === true &&
    ["light", "medium", "heavy"].includes(item.system.type?.value)
  );

  // use 99 for null dex cap so min() never restricts stat modifier
  const maxDex = equippedArmor?.system.armor.dex ?? 99;

  const acWis = actor.system.abilities.wis.mod < maxDex ? actor.system.abilities.wis.mod : maxDex;

  // Avoid redundant writes to prevent re-trigger
  const current = actor.getFlag(MODULE_ID, "acWis");
  if (current === acWis) return;

  await actor.setFlag(MODULE_ID, "acWis", acWis);
}

// Sync maxDex on actor update.
Hooks.on("updateActor", (actor, _changes, _options, _userId) => {
  _syncACWisFlag(actor);
});

//  Sync maxDex when equipping/unequipping armor
Hooks.on("createItem", (item, _options, _userId) => {
  if (item.parent instanceof Actor) _syncACWisFlag(item.parent);
});

Hooks.on("updateItem", (item, _changes, _options, _userId) => {
  if (item.parent instanceof Actor) _syncACWisFlag(item.parent);
});

Hooks.on("deleteItem", (item, _options, _userId) => {
  if (item.parent instanceof Actor) _syncACWisFlag(item.parent);
});

// Sync maxDex on world load
Hooks.once("ready", () => {
  for (const actor of game.actors) {
    _syncACWisFlag(actor);
  }
});
