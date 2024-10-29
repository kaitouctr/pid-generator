const Genders = Object.freeze({
    MALE: Symbol("male"),
    FEMALE: Symbol("female"),
    UNKNOWN: Symbol("gender unknown")
});

const ShinySearch = Object.freeze({
    ANY: Symbol("any"),
    ALL_SHINY: Symbol("all"),
    SQUARE_ONLY: Symbol("square"),
    STAR_ONLY: Symbol("star"),
    NON_SHINY: Symbol("non-shiny")
});

const Natures = Object.freeze({
    hardy: 0, lonely: 1, brave: 2, adamant: 3, naughty: 4,
    bold: 5, docile: 6, relaxed: 7, impish: 8, lax: 9,
    timid: 10, hasty: 11, serious: 12, jolly: 13, naive: 14,
    modest: 15, mild: 16, quiet: 17, bashful: 18, rash: 19,
    calm: 20, gentle: 21, sassy: 22, careful: 23, quirky: 24
});

const GenderThresholds = Object.freeze({
    gender_unknown: 255,
    female: 254,
    male_to_female_1_7: 225,
    male_to_female_1_3: 191,
    male_to_female_1_1: 127,
    male_to_female_3_1: 63,
    male_to_female_7_1: 31,
    male: 0
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
    switch(shinySearch) {
        case ShinySearch['ANY']: thresholdRange = [0x0, 0xFFFF + 1]; break;
        case ShinySearch['ALL_SHINY']: thresholdRange = [0x0, 0x7 + 1]; break;
        case ShinySearch['SQUARE_ONLY']: thresholdRange = [0x0, 0x0 + 1]; break;
        case ShinySearch['STAR_ONLY']: thresholdRange = [0x1, 0x7 + 1]; break;
        case ShinySearch['NON_SHINY']: thresholdRange = [0x8, 0xFFFF + 1]; break;
    }
    const pidUpper = getRandomInt(0x0, 0xFFFF + 1);
    const threshold = getRandomInt(...thresholdRange);
    const pidLower = tid ^ sid ^ pidUpper ^ threshold;
    return (pidUpper << 16 | pidLower) >>> 0;
}

function readNatureFromPID(pid) {
    const lookupTable = Object.freeze(getReverseTable(Natures));
    return lookupTable[pid % 25];
}

function readAbilityFromPID(pid) {
    return pid & 1;
}

function readGenderFromPID(pid, genderRatio) {
    const encodedGender = pid % 256;
    const lookupTable = getReverseTable(GenderThresholds);
    if (lookupTable[genderRatio] === "male") {
        return Genders['MALE'];
    }
    if (lookupTable[genderRatio] === "female") {
        return Genders['FEMALE'];
    }
    if (lookupTable[genderRatio] === "gender_unknown") {
        return Genders['UNKNOWN'];
    }
    if (encodedGender >= genderRatio) {
        return Genders['MALE'];
    } else {
        return Genders['FEMALE'];
    }
}

function searchForPID(tid, sid, shinySearch, nature, ability, gender, genderRatio) {
    let pid;
    let pidFound = false;
    while (!pidFound) {
        pid = randomPID(tid, sid, shinySearch);
        if (nature != null && nature != readNatureFromPID(pid)) {
            continue;
        }
        if (ability != null && ability != readAbilityFromPID(pid)) {
            continue;
        }
        if (gender != readGenderFromPID(pid, genderRatio)) {
            continue;
        }
        pidFound = true;
    }
    return pid;
}

const submitButton = document.getElementById("submitParamsButton");
const tidEntry = document.getElementById("tidEntry");
const sidEntry = document.getElementById("sidEntry");
const genderDropdown = document.getElementById("genderEntry")
const genderRatioDropdown = document.getElementById("genderRatioEntry")
genderDropdown.addEventListener("change", function () {
    const ratioOptions = genderRatioDropdown.querySelectorAll("option")
    ratioOptions[6].hidden = true;
    ratioOptions[7].hidden = true;
    if (genderDropdown.value === "gender_unknown") {
        for (const ratioOption of ratioOptions) {
            ratioOption.selected = ratioOption.defaultSelected;
        }
        genderRatioDropdown.disabled = true;
        return;
    } else {
        genderRatioDropdown.disabled = false;
    }
    if (genderDropdown.value === "male") {
        ratioOptions[6].hidden = false;
        // Prevent illegal combination of gender ratio / gender
        if (ratioOptions[7].selected) {
            ratioOptions[7].selected = false;
            ratioOptions[0].selected = true;
        }
    }
    if (genderDropdown.value === "female") {
        ratioOptions[7].hidden = false;
        // Prevent illegal combination of gender ratio / gender
        if (ratioOptions[6].selected) {
            ratioOptions[6].selected = false;
            ratioOptions[0].selected = true;
        }
    }  
});

tidEntry.addEventListener("input", function() {
    if (tidEntry.valueAsNumber < parseInt(tidEntry.min)) {
        tidEntry.value = tidEntry.min;
    }
    if (tidEntry.valueAsNumber > parseInt(tidEntry.max)) {
        tidEntry.value = tidEntry.max;
    }
});

sidEntry.addEventListener("input", function() {
    if (sidEntry.valueAsNumber < parseInt(sidEntry.min)) {
        sidEntry.value = sidEntry.min;
    }
    if (sidEntry.valueAsNumber > parseInt(sidEntry.max)) {
        sidEntry.value = sidEntry.max;
    }
});


submitButton.addEventListener("click", function() {
    const [tid, sid] = ( function() {
        if (tidEntry.value === "" || sidEntry.value === "") {
            alert("Please input TID and SID");
            return ["illegal", "illegal"];
        }
        return [tidEntry.valueAsNumber, sidEntry.valueAsNumber]
    })();
    if (tid === "illegal" || sid === "illegal") {
        return;
    }
    const shinySearch = ( function() {
        switch (document.getElementById("searchShinyEntry").value) {
            case "any": return ShinySearch['ANY'];
            case "non-shiny": return ShinySearch['NON_SHINY'];
            case "square": return ShinySearch['SQUARE_ONLY'];
            case "star": return ShinySearch['STAR_ONLY'];
            case "all-shiny": return ShinySearch['ALL_SHINY'];
            default: alert("illegal value"); return null;
        }
    })();
    if (!shinySearch) {
        return;
    }
    const gender = ( function() {
        switch (genderDropdown.value) {
            case "male": return Genders['MALE'];
            case "female": return Genders['FEMALE'];
            case "gender_unknown": return Genders['UNKNOWN'];
            default: alert("illegal value"); return null;
        }
    })();
    if (!gender) {
        return;
    }
    const genderRatio = ( function() {
        if ((gender === Genders['MALE'] || gender === Genders['FEMALE']) && genderRatioDropdown.value === "gender_unknown") {
            alert("Please set gender ratio!");
            return "illegal";
        }
        return GenderThresholds[genderRatioDropdown.value];
    })();
    if (genderRatio === "illegal") {
        return;
    }
    const nature = (function() {
        let temp;
        if (document.getElementById("natureEntry").value) {
            temp = getReverseTable(Natures)[Natures[document.getElementById("natureEntry").value.toLowerCase()]];
        } else {
            temp = null;
        }
        return temp;
    })();
    const ability = (function () {
        let temp;
        if (document.getElementById("abilityEntry").value != "") {
            temp = parseInt(document.getElementById("abilityEntry").value);
        } else {
            temp = null;
        }
        return temp;
    })();
    const pid = searchForPID(tid, sid, shinySearch, nature, ability, gender, genderRatio);
    document.getElementById("pidInsert").innerHTML = pid.toString(16).padStart(8, "0").toUpperCase();
    document.getElementById("tidInsert").innerHTML = tid.toString().padStart(5, "0");
    document.getElementById("sidInsert").innerHTML = sid.toString().padStart(5, "0");
    document.getElementById("natureInsert").innerHTML = (function(){
        // Work around for title case
        function toTitleCase(str) {
            return str.replace(
              /\w\S*/g,
              text => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
            );
        }
        return toTitleCase(readNatureFromPID(pid));
    })();
    document.getElementById("abilityInsert").innerHTML = readAbilityFromPID(pid)
    document.getElementById("genderInsert").innerHTML = (function(){
        switch(gender) {
            case Genders['MALE']: return "♂";
            case Genders['FEMALE']: return "♀";
            case Genders['UNKNOWN']: return "⚲";
            default: return "";
        }
    })();
});