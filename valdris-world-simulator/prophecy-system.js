const prophecyTemplates = [
  'When the {omen} rises, the {hero} shall {act}.',
  'In the {season}, a {artifact} will awaken the {realm}.',
  'The {faction} shall fall unless the {hero} heeds the {omen}.'
];

const tokens = {
  omen: ['crimson star', 'ashen moon', 'silent bell'],
  hero: ['lost heir', 'silver blade', 'wandering mage'],
  act: ['restore balance', 'break the seal', 'banish the shadow'],
  season: ['first thaw', 'long night', 'golden harvest'],
  artifact: ['sunstone', 'void key', 'ancient crown'],
  realm: ['kingdom', 'wilds', 'citadel'],
  faction: ['Valdric Empire', 'Sylvan Dominion', 'Orcish Dominion']
};

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function fillTemplate(template) {
  return template.replace(/\{(\w+)\}/g, (_, key) => randomItem(tokens[key] || ['mystery']));
}

export function createProphecySystem(state) {
  const prophecyState = state.prophecy;

  function generate() {
    const text = fillTemplate(randomItem(prophecyTemplates));
    const prophecy = {
      id: `${Date.now()}`,
      text,
      triggers: [],
      progress: 0,
      fulfilled: false
    };
    prophecyState.active.push(prophecy);
    return prophecy;
  }

  function advance(prophecyId) {
    const prophecy = prophecyState.active.find((item) => item.id === prophecyId);
    if (!prophecy) {
      return null;
    }
    prophecy.progress += 1;
    if (prophecy.progress >= 3) {
      prophecy.fulfilled = true;
    }
    return prophecy;
  }

  function getSummary() {
    if (prophecyState.active.length === 0) {
      return 'No prophecies.';
    }
    return prophecyState.active.map((prophecy) => prophecy.text).join(' | ');
  }

  return {
    generate,
    advance,
    getSummary
  };
}
