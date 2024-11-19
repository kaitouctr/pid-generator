//! SPDX-License-Identifier: MIT
// Copyright 2024 Luong Truong

const Genders = Object.freeze({
  MALE: Symbol('male'),
  FEMALE: Symbol('female'),
  UNKNOWN: Symbol('gender unknown'),
});

const ShinySearch = Object.freeze({
  ANY: Symbol('any'),
  ALL_SHINY: Symbol('all'),
  SQUARE_ONLY: Symbol('square'),
  STAR_ONLY: Symbol('star'),
  NON_SHINY: Symbol('non-shiny'),
});

const Natures = Object.freeze([
  'Hardy',
  'Lonely',
  'Brave',
  'Adamant',
  'Naughty',
  'Bold',
  'Docile',
  'Relaxed',
  'Impish',
  'Lax',
  'Timid',
  'Hasty',
  'Serious',
  'Jolly',
  'Naive',
  'Modest',
  'Mild',
  'Quiet',
  'Bashful',
  'Rash',
  'Calm',
  'Gentle',
  'Sassy',
  'Careful',
  'Quirky',
]);

const GenderThresholds = Object.freeze({
  gender_unknown: 255,
  female: 254,
  male_to_female_1_7: 225,
  male_to_female_1_3: 191,
  male_to_female_1_1: 127,
  male_to_female_3_1: 63,
  male_to_female_7_1: 31,
  male: 0,
});

// Can't believe JS does not have a proper random int function!! Copied from MDN
function getRandomInt(min, max) {
  const minCeiled = Math.ceil(min);
  const maxFloored = Math.floor(max);
  return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled); // The maximum is exclusive and the minimum is inclusive
}

function getReverseTable(table) {
  let reverseTable = {};
  for (const entry of Object.entries(table)) {
    reverseTable[entry[1]] = entry[0];
  }
  return reverseTable;
}

function randomPID(tid, sid, shinySearch) {
  let thresholdRange;
  switch (shinySearch) {
    case ShinySearch.ANY:
      thresholdRange = [0x0, 0xffff + 1];
      break;
    case ShinySearch.ALL_SHINY:
      thresholdRange = [0x0, 0x7 + 1];
      break;
    case ShinySearch.SQUARE_ONLY:
      thresholdRange = [0x0, 0x0 + 1];
      break;
    case ShinySearch.STAR_ONLY:
      thresholdRange = [0x1, 0x7 + 1];
      break;
    case ShinySearch.NON_SHINY:
      thresholdRange = [0x8, 0xffff + 1];
      break;
  }
  const pidUpper = getRandomInt(0x0, 0xffff + 1);
  const threshold = getRandomInt(...thresholdRange);
  const pidLower = tid ^ sid ^ pidUpper ^ threshold;
  return ((pidUpper << 16) | pidLower) >>> 0;
}

function readNatureFromPID(pid) {
  return Natures[pid % 25];
}

function readAbilityFromPID(pid) {
  return pid & 1;
}

function readGenderFromPID(pid, genderRatio) {
  const encodedGender = pid % 256;
  const lookupTable = getReverseTable(GenderThresholds);
  if (lookupTable[genderRatio] === 'male') {
    return Genders.MALE;
  }
  if (lookupTable[genderRatio] === 'female') {
    return Genders.FEMALE;
  }
  if (lookupTable[genderRatio] === 'gender_unknown') {
    return Genders.UNKNOWN;
  }
  if (encodedGender >= genderRatio) {
    return Genders.MALE;
  } else {
    return Genders.FEMALE;
  }
}

function searchForPID(
  tid,
  sid,
  shinySearch,
  nature,
  ability,
  gender,
  genderRatio
) {
  let pid;
  let pidFound = false;
  while (!pidFound) {
    pid = randomPID(tid, sid, shinySearch);
    if (nature !== null && nature !== readNatureFromPID(pid)) {
      continue;
    }
    if (ability !== null && ability !== readAbilityFromPID(pid)) {
      continue;
    }
    if (gender !== readGenderFromPID(pid, genderRatio)) {
      continue;
    }
    pidFound = true;
  }
  return pid;
}

const submitButton = document.getElementById('submitParamsButton');
const genderDropdown = document.getElementById('genderEntry');
const genderRatioDropdown = document.getElementById('genderRatioEntry');
genderDropdown.addEventListener('change', function () {
  const ratioOptions = genderRatioDropdown.querySelectorAll('option');
  ratioOptions[6].hidden = true;
  ratioOptions[7].hidden = true;
  if (genderDropdown.value === 'gender_unknown') {
    for (const ratioOption of ratioOptions) {
      ratioOption.selected = ratioOption.defaultSelected;
    }
    genderRatioDropdown.disabled = true;
    return;
  } else {
    genderRatioDropdown.disabled = false;
  }
  if (genderDropdown.value === 'male') {
    ratioOptions[6].hidden = false;
    // Prevent illegal combination of gender ratio / gender
    if (ratioOptions[7].selected) {
      ratioOptions[7].selected = false;
      ratioOptions[0].selected = true;
    }
  }
  if (genderDropdown.value === 'female') {
    ratioOptions[7].hidden = false;
    // Prevent illegal combination of gender ratio / gender
    if (ratioOptions[6].selected) {
      ratioOptions[6].selected = false;
      ratioOptions[0].selected = true;
    }
  }
});

document.getElementById('params').onsubmit = () => false;

document.getElementById('params').addEventListener('submit', function () {
  const data = new FormData(this);
  const tid = data.get('tid');
  const sid = data.get('sid');
  const shinySearch = (() => {
    switch (data.get('shiny')) {
      case 'any':
        return ShinySearch['ANY'];
      case 'non-shiny':
        return ShinySearch['NON_SHINY'];
      case 'square':
        return ShinySearch['SQUARE_ONLY'];
      case 'star':
        return ShinySearch['STAR_ONLY'];
      case 'all-shiny':
        return ShinySearch['ALL_SHINY'];
      default:
        alert('illegal value');
        return null;
    }
  })();
  if (!shinySearch) {
    return;
  }
  const gender = (() => {
    switch (data.get('gender')) {
      case 'male':
        return Genders.MALE;
      case 'female':
        return Genders.FEMALE;
      case 'gender_unknown':
        return Genders.UNKNOWN;
      default:
        alert('illegal value');
        return null;
    }
  })();
  if (!gender) {
    return;
  }
  const genderRatio = (() => {
    const index = data.get('genderRatio') ?? 'gender_unknown';
    if (
      (gender === Genders.MALE || gender === Genders.FEMALE) &&
      index === 'gender_unknown'
    ) {
      alert('Please set gender ratio!');
      return 'illegal';
    }
    return GenderThresholds[index];
  })();
  if (genderRatio === 'illegal') {
    return;
  }
  const nature = data.get('nature') || null;
  const ability =
    data.get('ability') !== '' ? Number(data.get('ability')) : null;
  const pid = searchForPID(
    tid,
    sid,
    shinySearch,
    nature,
    ability,
    gender,
    genderRatio
  );
  document.getElementById('pidInsert').innerText = pid
    .toString(16)
    .padStart(8, '0')
    .toUpperCase();
  document.getElementById('natureInsert').innerText = readNatureFromPID(pid);
  document.getElementById('abilityInsert').innerText = readAbilityFromPID(pid);
  document.getElementById('genderInsert').innerText = (() => {
    switch (gender) {
      case Genders.MALE:
        return '♂';
      case Genders.FEMALE:
        return '♀';
      case Genders.UNKNOWN:
        return '⚲';
      default:
        return '';
    }
  })();
});
