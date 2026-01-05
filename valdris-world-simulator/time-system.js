const months = [
  'Frostmoon',
  'Emberrise',
  'Stormcall',
  'Verdant',
  'Suncrest',
  'Highsummer',
  'Goldleaf',
  'Harvestend',
  'Duskwane',
  'Nightveil',
  'Ashfall',
  'Darknight'
];

const seasons = [
  { name: 'winter', months: [1, 2, 12] },
  { name: 'spring', months: [3, 4, 5] },
  { name: 'summer', months: [6, 7, 8] },
  { name: 'autumn', months: [9, 10, 11] }
];

const festivals = [
  { name: 'Frostbound Vigil', month: 1, day: 1, effect: 'Travel slows as people honor the first snowfall.' },
  { name: 'Bloomtide', month: 4, day: 15, effect: 'Markets flourish and spirits rise.' },
  { name: 'Sunspire Jubilee', month: 7, day: 10, effect: 'Combat morale rises during celebrations.' },
  { name: 'Night of Masks', month: 11, day: 28, effect: 'Rumors and intrigue intensify.' }
];

const timeOfDaySlots = [
  { name: 'dawn', start: 5, end: 7 },
  { name: 'morning', start: 8, end: 11 },
  { name: 'afternoon', start: 12, end: 16 },
  { name: 'evening', start: 17, end: 20 },
  { name: 'night', start: 21, end: 4 }
];

function getSeason(month) {
  const entry = seasons.find((season) => season.months.includes(month));
  return entry ? entry.name : 'unknown';
}

function getTimeOfDay(hour) {
  if (hour >= 5 && hour <= 7) return 'dawn';
  if (hour >= 8 && hour <= 11) return 'morning';
  if (hour >= 12 && hour <= 16) return 'afternoon';
  if (hour >= 17 && hour <= 20) return 'evening';
  return 'night';
}

function getFestival(month, day) {
  return festivals.find((festival) => festival.month === month && festival.day === day) || null;
}

export function createTimeSystem(state) {
  const timeState = state.time;

  function advanceTime({ days = 0, hours = 0 } = {}) {
    let totalHours = timeState.hour + hours + days * 24;
    while (totalHours >= 24) {
      totalHours -= 24;
      timeState.day += 1;
      if (timeState.day > 30) {
        timeState.day = 1;
        timeState.month += 1;
        if (timeState.month > 12) {
          timeState.month = 1;
          timeState.year += 1;
        }
      }
    }
    while (totalHours < 0) {
      totalHours += 24;
      timeState.day -= 1;
      if (timeState.day < 1) {
        timeState.day = 30;
        timeState.month -= 1;
        if (timeState.month < 1) {
          timeState.month = 12;
          timeState.year -= 1;
        }
      }
    }
    timeState.hour = totalHours;
  }

  function getCurrentDate() {
    const festival = getFestival(timeState.month, timeState.day);
    const festivalText = festival ? ` Festival: ${festival.name} (${festival.effect})` : '';
    return `Year ${timeState.year}, ${months[timeState.month - 1]} ${timeState.day} (${getTimeOfDay(timeState.hour)})${festivalText}`;
  }

  return {
    months,
    seasons,
    festivals,
    timeOfDaySlots,
    getSeason: () => getSeason(timeState.month),
    getTimeOfDay: () => getTimeOfDay(timeState.hour),
    getFestival: () => getFestival(timeState.month, timeState.day),
    advanceTime,
    getCurrentDate
  };
}
