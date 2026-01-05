const criminalOrgs = ['Shadow Syndicate', 'Blood Ravens', 'Smugglers'];
const crimeTypes = ['theft', 'burglary', 'smuggling', 'assassination'];

export function createCrimeSystem(state) {
  const crimeState = state.crime;

  function init() {
    criminalOrgs.forEach((org) => {
      if (crimeState.turf[org] === undefined) {
        crimeState.turf[org] = 30;
      }
    });
  }

  function reportCrime(type) {
    crimeState.heat += 5;
    return { type, heat: crimeState.heat };
  }

  function turfWar(org) {
    crimeState.turf[org] = Math.min(100, (crimeState.turf[org] ?? 0) + 5);
  }

  function getSummary() {
    return `Heat ${crimeState.heat}, Turf: ${criminalOrgs.map((org) => `${org} ${crimeState.turf[org]}`).join(', ')}`;
  }

  init();

  return {
    criminalOrgs,
    crimeTypes,
    init,
    reportCrime,
    turfWar,
    getSummary
  };
}
