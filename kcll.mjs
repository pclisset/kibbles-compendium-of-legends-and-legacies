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
    formula: "@attributes.ac.armor + min(@abilities.wis.mod, @flags.KCLL.maxDex)"
  };
});

/**
 * Inject the equipped armor's maximum dexterity bonus into roll data as
 * @flags.KCLL.maxDex. This allows KCLL features to reference the armor's
 * dex cap.
 *
 * When no armor is equipped, maxDex is set to 99
 */

const MODULE_ID = "KCLL";

async function _syncMaxDexFlag(actor) {
  // Only process player characters and NPCs, not vehicles etc.
  if (!["character", "npc"].includes(actor.type)) return;

  const equippedArmor = actor.items.find(item =>
    item.type === "equipment" &&
    item.system.equipped === true &&
    ["light", "medium", "heavy"].includes(item.system.armor?.type)
  );

  // use 99 for null dex cap so min() never restricts stat modifier
  const maxDex = equippedArmor?.system.armor.dex ?? 99;

  // Avoid redundant writes to prevent re-trigger
  const current = actor.getFlag(MODULE_ID, "maxDex");
  if (current === maxDex) return;

  await actor.setFlag(MODULE_ID, "maxDex", maxDex);
}

// Sync maxDex on actor update.
Hooks.on("updateActor", (actor, _changes, _options, _userId) => {
  _syncMaxDexFlag(actor);
});

//  Sync maxDex when equipping/unequipping armor
Hooks.on("createItem", (item, _options, _userId) => {
  if (item.parent instanceof Actor) _syncMaxDexFlag(item.parent);
});

Hooks.on("updateItem", (item, _changes, _options, _userId) => {
  if (item.parent instanceof Actor) _syncMaxDexFlag(item.parent);
});

Hooks.on("deleteItem", (item, _options, _userId) => {
  if (item.parent instanceof Actor) _syncMaxDexFlag(item.parent);
});

// Sync maxDex on world load
Hooks.once("ready", () => {
  for (const actor of game.actors) {
    _syncMaxDexFlag(actor);
  }
});
