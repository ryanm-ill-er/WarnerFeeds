const eventTypes = {
  "Tornado Warning": "tornado-warning",
  "Observed Tornado Warning": "observed-tornado-warning",
  "PDS Tornado Warning": "pds-tornado-warning",
  "Tornado Emergency": "tornado-emergency",
  "Severe Thunderstorm Warning": "severe-thunderstorm-warning",
  "Severe Thunderstorm Warning (Considerable)":
    "severe-thunderstorm-considerable",
  "Severe Thunderstorm Warning (Destructive)":
    "pds-severe-thunderstorm-warning",
  "Flash Flood Warning": "flash-flood-warning",
  "Flash Flood Emergency": "flash-flood-emergency",
  "Tornado Watch": "tornado-watch",
  "Severe Thunderstorm Watch": "severe-thunderstorm-watch",
  "Winter Weather Advisory": "winter-weather-advisory",
  "Winter Storm Watch": "winter-storm-watch",
  "Winter Storm Warning": "winter-storm-warning",
  "Special Weather Statement": "special-weather-statement",
  "Ice Storm Warning": "ice-storm-warning",
  "Blizzard Warning": "blizzard-warning",
  "High Wind Warning": "high-wind-warning",
  "High Wind Watch": "high-wind-watcv=h",
  "Wind Advisory": "wind-advisory",
  "Dense Fog Advisory": "dense-fog-advisory",
};

const priority = {
  "Tornado Emergency": 1,
  "PDS Tornado Warning": 2,
  "Observed Tornado Warning": 3,
  "Tornado Warning": 4,
  "Severe Thunderstorm Warning (Destructive)": 5,
  "Severe Thunderstorm Warning (Considerable)": 6,
  "Severe Thunderstorm Warning": 7,
  "Special Weather Statement": 8,
  "Tornado Watch": 9,
  "Severe Thunderstorm Watch": 10,
  "Flash Flood Emergency": 11,
  "Flash Flood Warning": 12,
  "Blizzard Warning": 13,
  "Ice Storm Warning": 14,
  "Winter Storm Warning": 15,
  "Winter Storm Watch": 16,
  "Winter Weather Advisory": 17,
  "High Wind Warning": 18,
  "High Wind Watch": 19,
  "Wind Advisory": 20,
  "Dense Fog Advisory": 21,
};

const STATE_FIPS_TO_ABBR = {
  Any: "US",
  "01": "AL",
  "02": "AK",
  "04": "AZ",
  "05": "AR",
  "06": "CA",
  "08": "CO",
  "09": "CT",
  10: "DE",
  11: "DC",
  12: "FL",
  13: "GA",
  15: "HI",
  16: "ID",
  17: "IL",
  18: "IN",
  19: "IA",
  20: "KS",
  21: "KY",
  22: "LA",
  23: "ME",
  24: "MD",
  25: "MA",
  26: "MI",
  27: "MN",
  28: "MS",
  29: "MO",
  30: "MT",
  31: "NE",
  32: "NV",
  33: "NH",
  34: "NJ",
  35: "NM",
  36: "NY",
  37: "NC",
  38: "ND",
  39: "OH",
  40: "OK",
  41: "OR",
  42: "PA",
  44: "RI",
  45: "SC",
  46: "SD",
  47: "TN",
  48: "TX",
  49: "UT",
  50: "VT",
  51: "VA",
  53: "WA",
  54: "WV",
  55: "WI",
  56: "WY",
};

function getStateFromSAME(sameCode) {
  const fips = sameCode.slice(1, 3);
  return STATE_FIPS_TO_ABBR[fips] || "Unknown";
}

let notificationsMuted = false;

let currentTimeZone = "ET";
let notifiedWarnings = new Map();

const warningListElement = document.getElementById("warningList");
const expirationElement = document.getElementById("expiration");
const eventTypeElement = document.getElementById("eventType");
const countiesElement = document.getElementById("counties");

const tornadoCountElement = document.getElementById("tornadoCount");
const thunderstormCountElement = document.getElementById("thunderstormCount");
const floodCountElement = document.getElementById("floodCount");
const winterWeatherCountElement = document.getElementById("winterWeatherCount");

const socket = new WebSocket("");

socket.addEventListener("message", (event) => {
  const warning = JSON.parse(event.data);
  activeWarnings.push({ properties: warning });
  displayNotification({ properties: warning });
  updateDashboard();
});

socket.addEventListener("open", () => {
  console.log("✅ Connected to XMPP bridge server");
});

socket.addEventListener("error", (error) => {
  console.error("❌ WebSocket Error:", error);
});

socket.addEventListener("message", (event) => {
  const warning = JSON.parse(event.data);
  activeWarnings.push({ properties: warning });
  displayNotification({ properties: warning });
  updateDashboard();
});

let previousWarningIds = new Set();

const labels = {
  tornado: "🌪️TORNADO WARNINGS",
  thunderstorm: "⛈️SEVERE THUNDERSTORM WARNINGS",
  flood: "💦FLASH FLOOD WARNINGS",
  winter: "❄️WINTER WEATHER WARNINGS",
};

let currentWarningIndex = 0;
let activeWarnings = [];
let previousWarningVersions = new Map();
let previousWarnings = new Map();

document.body.addEventListener("click", enableSound);

function enableSound() {
  document.body.removeEventListener("click", enableSound);
}

const headerElement = document.createElement("div");
headerElement.textContent = "Latest Alerts:";
headerElement.className = "warning-list-header";

warningListElement.prepend(headerElement);

const checkboxContainer = document.querySelector(".checkbox-container");

selectedAlerts = new Set([
  "Tornado Warning",
  "Severe Thunderstorm Warning",
  "Flash Flood Warning",
  "Flood Warning",
  "Flood Advisory",
  "Special Weather Statement",
]);

function toggleslider() {
  var slider = document.getElementById("sliderContainer");
  var body = document.body;

  if (slider.style.transform === "translateY(0%)") {
    slider.style.transform = "translateY(-100%)";
    body.classList.remove("overlay");
  } else {
    slider.style.transform = "translateY(0%)";
    body.classList.add("overlay");
  }
}

function handleApiResponse(response) {
  try {
    let cleanResponse = response
      .trim()
      .replace(/,\s*([\]}])/g, "$1")
      .replace(/^[\uFEFF\xA0]+|[\uFEFF\xA0]+$/g, "");

    let parsedResponse = JSON.parse(cleanResponse);

    if (!Array.isArray(parsedResponse)) {
      console.warn(
        "Received a single alert object, wrapping it into an array."
      );
      parsedResponse = [parsedResponse];
    }

    parsedResponse.forEach((alert) => {
      const eventName = getEventName(alert);
      const counties = formatCountiesNotification(alert.properties.areaDesc);

      console.log(`Event: ${eventName}, Counties: ${counties}`);

      const warning = {
        properties: {
          event: eventName,
          areaDesc: counties,
          expires: alert.properties.expires,
          description: alert.properties.description,
          instruction: alert.properties.instruction,
        },
      };
      showNotification(warning);
    });
  } catch (error) {
    console.error("Error parsing response:", error);
    alert(
      "⚠️ Invalid JSON input!\n\nTip: Make sure your JSON is valid, no missing commas, brackets, etc.\nAlso make sure to wrap your object inside [ ] if needed!"
    );
  }
}

function adjustMessageFontSize(messageElement) {
  const originalFontSize = 36;
  let currentFontSize = originalFontSize;

  messageElement.style.fontSize = `${currentFontSize}px`;

  while (
    messageElement.scrollHeight > messageElement.clientHeight &&
    currentFontSize > 20
  ) {
    currentFontSize -= 1;
    messageElement.style.fontSize = `${currentFontSize}px`;
  }

  if (messageElement.scrollHeight > messageElement.clientHeight) {
    const originalText = messageElement.textContent;
    let textLength = originalText.length;

    while (
      messageElement.scrollHeight > messageElement.clientHeight &&
      textLength > 0
    ) {
      textLength -= 5;
      messageElement.textContent =
        originalText.substring(0, textLength) + "...";
    }
  }
}

const countiesInput = document.getElementById("countiesInput");

document
  .getElementById("generateAlertButton")
  .addEventListener("click", function () {
    const eventType = document.getElementById("alertType").value;
    const damageThreat = document.getElementById("damageThreat").value;
    const detection = document.getElementById("detection").value;
    const counties = countiesInput.value
      .split(",")
      .map((county) => county.trim());
    const expirationTime = parseInt(
      document.getElementById("expiration").value,
      10
    );

    const expirationDate = new Date();
    expirationDate.setMinutes(expirationDate.getMinutes() + expirationTime);

    const areaDesc = counties.map((county) => county.trim()).join("; ");
    countiesElement.textContent = `Counties: ${counties.join(", ")}`;

    const parameters = {
      thunderstormDamageThreat: ["NONE"],
      tornadoDamageThreat: ["NONE"],
      tornadoDetection: detection,
    };

    if (eventType.includes("Tornado Warning")) {
      if (eventType.includes("PDS Tornado Warning")) {
        parameters.tornadoDamageThreat = ["CONSIDERABLE"];
      } else if (eventType.includes("Tornado Emergency")) {
        parameters.tornadoDamageThreat = ["CATASTROPHIC"];
      } else if (eventType.includes("Observed Tornado Warning")) {
        parameters.tornadoDetection = ["OBSERVED"];
      }
    } else if (eventType.includes("Severe Thunderstorm Warning")) {
      if (eventType.includes("Severe Thunderstorm Warning (Considerable)")) {
        parameters.thunderstormDamageThreat = ["CONSIDERABLE"];
      } else if (
        eventType.includes("Severe Thunderstorm Warning (Destructive)")
      ) {
        parameters.thunderstormDamageThreat = ["DESTRUCTIVE"];
      }
    }

    const randomVTEC =
      generateRandomString(4) +
      "." +
      generateRandomString(4) +
      "." +
      generateRandomString(4) +
      "." +
      generateRandomString(4);
    const randomID = `urn:oid:urn:oid:2.49.0.1.840.0.${generateRandomString(
      32
    )}.001.1`;

    const warning = {
      id: randomID,
      properties: {
        event: eventType,
        areaDesc: areaDesc,
        expires: expirationDate.toISOString(),
        VTEC: randomVTEC,
        parameters: parameters,
      },
    };

    showNotification(warning);
  });

function generateRandomString(length) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars[randomIndex];
  }
  return result;
}

function notifyWarningExpired(eventName, warningId, areaDesc = "N/A") {
  const expiredWarning = {
    properties: {
      event: `A weather alert expired - This was a ${eventName} near ${areaDesc}`,
      id: warningId,
      areaDesc: `This was a ${eventName} near ${areaDesc}`,
      alertColor: "#FFE4C4",
    },
  };
}

function testNotification(eventName) {
  const eventType = getEventName({
    properties: { event: eventName, parameters: {} },
  });

  const expirationDate = new Date();
  expirationDate.setMinutes(expirationDate.getMinutes() + 30);

  const allCounties = [
    "Washtenaw, MI",
    "Lenawee, MI",
    "Monroe, MI",
    "Wayne, MI",
    "Oakland, MI",
    "Macomb, MI",
    "Livingston, MI",
    "Genesee, MI",
    "Ingham, MI",
    "Jackson, MI",
    "Hillsdale, MI",
    "Calhoun, MI",
    "Eaton, MI",
    "Shiawassee, MI",
    "Clinton, MI",
    "Lapeer, MI",
    "St. Clair, MI",
    "Barry, MI",
    "Kent, MI",
    "Ottawa, MI",
    "Muskegon, MI",
    "Saginaw, MI",
    "Bay, MI",
    "Midland, MI",
    "Isabella, MI",
    "Gratiot, MI",
    "Ionia, MI",
    "Montcalm, MI",
    "Mecosta, MI",
    "Newaygo, MI",
  ];

  const countyCount = Math.floor(Math.random() * 20) + 1;

  const shuffledCounties = allCounties.sort(() => 0.5 - Math.random());
  const selectedCounties = shuffledCounties.slice(0, countyCount);

  const areaDesc = "TEST - " + selectedCounties.join("; ");

  function generateRandomString(length) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      result += chars[randomIndex];
    }
    return result;
  }

  const randomVTEC = `${generateRandomString(4)}.${generateRandomString(
    4
  )}.${generateRandomString(4)}.${generateRandomString(4)}`;

  const randomID = `urn:oid:2.49.0.1.840.0.${generateRandomString(32)}.001.1`;

  const messageType = Math.random() < 0.5 ? "Alert" : "Update";

  const currentVersion = `v${Math.floor(Math.random() * 1000)}`;

  const parameters = {
    thunderstormDamageThreat: ["NONE"],
    tornadoDamageThreat: ["NONE"],
    tornadoDetection: ["RADAR INDICATED"],
  };

  if (eventName.includes("Tornado Warning")) {
    if (eventName.includes("PDS Tornado Warning")) {
      parameters.tornadoDamageThreat = ["CONSIDERABLE"];
    } else if (eventName.includes("Tornado Emergency")) {
      parameters.tornadoDamageThreat = ["CATASTROPHIC"];
    } else if (eventName.includes("Observed Tornado Warning")) {
      parameters.tornadoDetection = ["OBSERVED"];
    }
  } else if (eventName.includes("Severe Thunderstorm Warning")) {
    if (eventName.includes("Considerable")) {
      parameters.thunderstormDamageThreat = ["CONSIDERABLE"];
    } else if (eventName.includes("Destructive")) {
      parameters.thunderstormDamageThreat = ["DESTRUCTIVE"];
    }
  } else if (eventName.includes("Flash Flood Warning")) {
    if (eventName.includes("Flash Flood Emergency")) {
      parameters.flashFloodDamageThreat = ["CATASTROPHIC"];
    }
  }

  const warning = {
    id: randomID,
    properties: {
      event: eventType,
      areaDesc: areaDesc,
      actionSection:
        "THIS IS A TEST MESSAGE. DO NOT TAKE ACTION ON THIS MESSAGE.",
      expires: expirationDate.toISOString(),
      VTEC: randomVTEC,
      parameters: parameters,
      messageType: messageType,
      currentVersion: currentVersion,
    },
  };
  if (!window.activeWarningsSet) {
    window.activeWarningsSet = new Set();
  }
  window.activeWarningsSet.add(randomID);

  if (!previousWarnings) {
    previousWarnings = new Map();
  }
  previousWarnings.set(randomID, warning);

  if (!activeWarnings) {
    activeWarnings = [];
  }
  activeWarnings.push(warning);

  updateWarningCounters(warning);

  updateWarningList(activeWarnings);

  updateHighestAlert();

  showNotification(warning);

  updateDashboard(warning);
}

function updateWarningCounters(warning) {
  const eventType = warning.properties.event;

  let tornadoCount = parseInt(
    tornadoCountElement.textContent.split(":")[1]?.trim() || 0
  );
  let thunderstormCount = parseInt(
    thunderstormCountElement.textContent.split(":")[1]?.trim() || 0
  );
  let floodCount = parseInt(
    floodCountElement.textContent.split(":")[1]?.trim() || 0
  );
  let winterWeatherCount = parseInt(
    winterWeatherCountElement.textContent.split(":")[1]?.trim() || 0
  );

  if (eventType.includes("Tornado Warning")) {
    tornadoCount++;
    tornadoCountElement.textContent = `${labels.tornado}: ${tornadoCount}`;
  } else if (eventType.includes("Severe Thunderstorm Warning")) {
    thunderstormCount++;
    thunderstormCountElement.textContent = `${labels.thunderstorm}: ${thunderstormCount}`;
  } else if (eventType.includes("Flash Flood Warning")) {
    floodCount++;
    floodCountElement.textContent = `${labels.flood}: ${floodCount}`;
  } else if (
    eventType.includes("Winter") ||
    eventType.includes("Ice") ||
    eventType.includes("Blizzard")
  ) {
    winterWeatherCount++;
    winterWeatherCountElement.textContent = `${labels.winter}: ${winterWeatherCount}`;
  }
}

function updateHighestAlert() {
  const sortedWarnings = [...activeWarnings].sort((a, b) => {
    const priorityA = priority[getEventName(a)] || 999;
    const priorityB = priority[getEventName(b)] || 999;
    return priorityA - priorityB;
  });

  if (sortedWarnings.length > 0) {
    const highestAlert = sortedWarnings[0];
    const eventName = getEventName(highestAlert);

    const emergencyAlert = document.querySelector(".emergency-alert");
    if (emergencyAlert) {
      emergencyAlert.style.display = "block";

      if (
        eventName === "Tornado Emergency" ||
        eventName === "PDS Tornado Warning"
      ) {
        emergencyAlert.innerHTML =
          "THIS IS AN EXTREMELY DANGEROUS SITUATION. TAKE COVER NOW!";
      } else if (eventName === "Observed Tornado Warning") {
        emergencyAlert.innerHTML =
          "A TORNADO IS ON THE GROUND! TAKE COVER NOW!";
      } else if (eventName === "Severe Thunderstorm Warning (Destructive)") {
        emergencyAlert.innerHTML = "THESE ARE VERY DANGEROUS STORMS!";
      } else {
        emergencyAlert.innerHTML = getCallToAction(eventName);
      }

      emergencyAlert.className = "emergency-alert";
      const styleClass = eventTypes[eventName];
      if (styleClass) {
        emergencyAlert.classList.add(styleClass);
      }
    }
  }
}

function addAlert(feature) {
  allAlerts.push(feature);
  if (allAlerts.length > MAX_ALERTS) allAlerts.shift();
}

function testMostRecentAlert() {
  if (activeWarnings.length > 0) {
    const mostRecentWarning = activeWarnings[0];
    showNotification(mostRecentWarning);
  } else {
    alert("No active warnings to test.");
  }
}

function getEventName(alert) {
  if (!alert || !alert.properties) return "Unknown Event";

  const props = alert.properties;
  const event = props.event || "Unknown Event";
  const params = props.parameters || {};

  const thunderThreat = params.thunderstormDamageThreat?.[0]?.toUpperCase();
  const tornadoThreat = params.tornadoDamageThreat?.[0]?.toUpperCase();
  const tornadoDetection = params.tornadoDetection?.[0]?.toUpperCase();
  const flashFloodThreat = params.flashFloodDamageThreat?.[0]?.toUpperCase();

  if (event.includes("Tornado Warning")) {
    if (tornadoThreat === "CATASTROPHIC") return "Tornado Emergency";
    if (tornadoThreat === "CONSIDERABLE") return "PDS Tornado Warning";
    if (tornadoDetection === "OBSERVED") return "Observed Tornado Warning";
    return "Tornado Warning";
  }

  if (event.includes("Severe Thunderstorm Warning")) {
    if (thunderThreat === "CONSIDERABLE")
      return "Severe Thunderstorm Warning (Considerable)";
    if (thunderThreat === "DESTRUCTIVE")
      return "Severe Thunderstorm Warning (Destructive)";
    return "Severe Thunderstorm Warning";
  }

  if (event.includes("Flash Flood Warning")) {
    if (flashFloodThreat === "CATASTROPHIC") return "Flash Flood Emergency";
    return "Flash Flood Warning";
  }

  return event;
}

let currentCountyIndex = 0;

let isNotificationQueueEnabled = false;
let notificationQueue = [];
let isShowingNotification = false;

document
  .getElementById("singleNotificationToggleButton")
  .addEventListener("click", () => {
    isNotificationQueueEnabled = !isNotificationQueueEnabled;
    const buttonText = isNotificationQueueEnabled
      ? "Disable Single Notification Queue"
      : "Enable Single Notification Queue";
    document.getElementById("singleNotificationToggleButton").textContent =
      buttonText;
  });

function showNotification(warning) {
  const eventName = getEventName(warning);
  console.log(`Event Name in Notification: ${eventName}`);

  const warningId = warning.id;
  const currentVersion =
    warning.properties.parameters?.NWSheadline?.[0] || warning.properties.sent;
  const messageType = warning.properties?.messageType;

  const isNew = !notifiedWarnings.has(warningId);
  const isUpdated =
    !isNew && notifiedWarnings.get(warningId) !== currentVersion;
  const previousEvent = previousWarnings.get(warningId);
  const isUpgrade = !isNew && previousEvent && previousEvent !== eventName;

  console.log(
    `Notification Status - New: ${isNew}, Updated: ${isUpdated}, Upgrade: ${isUpgrade}`
  );

  if (warningId) {
    previousWarnings.set(warningId, eventName);
  }

  if (isNew || isUpdated || isUpgrade) {
    let notificationType = "NEW WEATHER ALERT:";
    if (messageType === "Update" || isUpdated) {
      notificationType = "UPDATED ALERT:";

      if (
        eventName === "Tornado Warning" ||
        eventName === "Observed Tornado Warning"
      ) {
        playSoundById("TorUpdateSound");
      } else if (eventName === "PDS Tornado Warning") {
        playSoundById("TorPDSUpdateSound");
      } else if (eventName === "Tornado Emergency") {
        playSoundById("TorEmergencyUpdateSound");
      } else {
        playSoundById("SVRCSound");
      }
    } else if (isUpgrade) {
      notificationType = "ALERT UPGRADED:";
      playSoundById("TORUPG");
    } else {
      if (eventName.includes("Tornado Emergency")) {
        playSoundById("TOREISS");
      } else if (eventName === "PDS Tornado Warning") {
        playSoundById("TorPDSSound");
      } else if (
        eventName === "Tornado Warning" ||
        eventName === "Observed Tornado Warning"
      ) {
        playSoundById("TorIssSound");
      } else if (eventName === "Severe Thunderstorm Warning") {
        playSoundById("SVRCSound");
      } else if (eventName === "Severe Thunderstorm Warning (Considerable)") {
        playSoundById("SVRCNEWSound");
      } else if (eventName === "Severe Thunderstorm Warning (Destructive)") {
        playSoundById("PDSSVRSound");
      } else if (eventName.includes("Tornado Watch")) {
        playSoundById("TOAWatch");
      } else if (eventName.includes("Severe Thunderstorm Watch")) {
        playSoundById("SVAWatch");
      } else {
        playSoundById("SVRCSound");
      }
    }

    console.log(`Determined Notification Type: ${notificationType}`);

    notifiedWarnings.set(warningId, currentVersion);
    console.log(`Stored current version for warning ID: ${warningId}`);

    if (isNotificationQueueEnabled) {
      notificationQueue.push({ warning, notificationType });
      console.log(
        `Added to notification queue: ${notificationType} for ${eventName}`
      );
      processNotificationQueue();
    } else {
      displayNotification(warning, notificationType);
      console.log(`Displayed notification immediately for ${eventName}`);
    }

    console.log(
      `🔔 Notification shown for ${eventName} (ID: ${warningId}, ${
        isNew ? "New" : isUpdated ? "Updated" : "Upgraded"
      })`
    );
  } else {
    console.log(
      `🔇 Skipping notification for already notified ${eventName} (ID: ${warningId})`
    );
  }
}

function processNotificationQueue() {
  if (isShowingNotification || notificationQueue.length === 0) {
    return;
  }

  isShowingNotification = true;
  const { warning, notificationType } = notificationQueue.shift();
  displayNotification(warning, notificationType);

  setTimeout(() => {
    isShowingNotification = false;
    processNotificationQueue();
  }, 5000);
}

function typeEffect(element, text, delay = 25, startDelay = 150) {
  element.textContent = "";
  let index = 0;

  setTimeout(() => {
    const typingInterval = setInterval(() => {
      if (index < text.length) {
        element.textContent += text.charAt(index);
        index++;
      } else {
        clearInterval(typingInterval);
      }
    }, delay);
  }, startDelay);
}
function getHighestActiveAlert() {
  if (!activeWarnings || activeWarnings.length === 0) {
    return { alert: "N/A", color: "#606060" };
  }

  const sortedWarnings = [...activeWarnings].sort((a, b) => {
    const eventNameA = getEventName(a);
    const eventNameB = getEventName(b);

    return priority[eventNameA] - priority[eventNameB];
  });

  const highestAlert = sortedWarnings[0];
  const eventName = getEventName(highestAlert);

  return {
    alert: eventName,
    color: getAlertColor(eventName),
    originalAlert: highestAlert,
  };
}

function updateClock() {
  const now = new Date();

  const displayTime = new Date(
    now.getTime() - (currentTimeZone === "CT" ? 1 : 0) * 60 * 60 * 1000
  );

  let hours = displayTime.getHours();
  const minutes = displayTime.getMinutes().toString().padStart(2, "0");
  const seconds = displayTime.getSeconds().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;

  const timeString = `${hours
    .toString()
    .padStart(2, "0")}:${minutes}:${seconds} ${ampm} ${currentTimeZone}`;
  const dateString = `${(displayTime.getMonth() + 1)
    .toString()
    .padStart(2, "0")}/${displayTime.getDate().toString().padStart(2, "0")}/${(
    displayTime.getFullYear() % 100
  )
    .toString()
    .padStart(2, "0")}`;

  document.getElementById(
    "clockDisplay"
  ).innerHTML = `<span class="time">${timeString}</span><span class="date">${dateString}</span>`;
}

function toggleTimeZone() {
  if (currentTimeZone === "ET") {
    currentTimeZone = "CT";
    document.getElementById("toggleTimeZone").textContent =
      "Switch to Eastern Time";
  } else {
    currentTimeZone = "ET";
    document.getElementById("toggleTimeZone").textContent =
      "Switch to Central Time";
  }
  updateClock();
}

setInterval(updateClock, 1000);
updateClock();

let lastAlertText = "";
let lastAlertColor = "";
let lastWarningsCount = 0;

function updateAlertBar() {
  const highestAlert = getHighestActiveAlert();
  const alertBar = document.getElementById("alertBar");
  const alertText = document.getElementById("highestAlertText");
  const activeAlertsBox = document.querySelector(".active-alerts-box");
  const semicircle = document.querySelector(".semicircle");
  
  const currentText =
    highestAlert.alert === "N/A"
      ? "INDIANA WEATHER NETWORK"
      : highestAlert.originalAlert
      ? getEventName(highestAlert.originalAlert)
      : highestAlert.alert;
  const currentColor = highestAlert.color || "#000000";
  const currentCount = activeWarnings.length;

  if (
    currentText === lastAlertText &&
    currentColor === lastAlertColor &&
    currentCount === lastWarningsCount
  )
    return;

  lastAlertText = currentText;
  lastAlertColor = currentColor;
  lastWarningsCount = currentCount;

  if (highestAlert.alert === "N/A" && activeWarnings.length === 0) {
    alertText.textContent = "INDIANA WEATHER NETWORK";
    alertBar.style.backgroundColor = "#000000";
    activeAlertsBox.style.display = "none";
    // Normal subtle gradient for inactive state
    semicircle.style.background = "linear-gradient(to right, rgba(100, 100, 100, 0.7) 0%, rgba(50, 50, 50, 0) 100%)";
  } else if (highestAlert.alert) {
    alertText.textContent = currentText;
    alertBar.style.backgroundColor = highestAlert.color;
    alertBar.style.setProperty("--glow-color", highestAlert.color);
    activeAlertsBox.textContent = "HIGHEST ACTIVE ALERT";
    activeAlertsBox.style.display = "block";
    // Black gradient for active alert state
    semicircle.style.background = "linear-gradient(to right, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0) 100%)";
  } else {
    alertText.textContent = "No valid alert found.";
    alertBar.style.backgroundColor = "#606060";
    activeAlertsBox.style.display = "none";
    // Normal subtle gradient for inactive state
    semicircle.style.background = "linear-gradient(to right, rgba(100, 100, 100, 0.7) 0%, rgba(50, 50, 50, 0) 100%)";
  }
}

function createWarningDetailModal() {
  if (!document.getElementById("warning-detail-modal")) {
    const modalContainer = document.createElement("div");
    modalContainer.id = "warning-detail-modal";
    modalContainer.className = "warning-detail-modal";
    modalContainer.style.display = "none";

    const modalContent = document.createElement("div");
    modalContent.className = "warning-detail-content";

    const closeButton = document.createElement("span");
    closeButton.className = "close-modal";
    closeButton.innerHTML = "&times;";
    closeButton.onclick = function () {
      document.getElementById("warning-detail-modal").style.display = "none";
    };

    modalContent.appendChild(closeButton);
    modalContainer.appendChild(modalContent);
    document.body.appendChild(modalContainer);

    window.addEventListener("click", function (event) {
      if (event.target === modalContainer) {
        modalContainer.style.display = "none";
      }
    });
  }
}

function showAlertDetails(warning) {
  document.getElementById("alertTitle").textContent = getEventName(warning);
  document.getElementById("alertDescription").textContent =
    warning.properties.areaDesc;

  const parameters = warning.properties.parameters || {};

  document.getElementById("maxWindGust").textContent =
    parameters.maxWindGust || "Not specified";
  document.getElementById("maxHailSize").textContent =
    parameters.maxHailSize || "Not specified";
  document.getElementById("tornadoDetection").textContent =
    parameters.tornadoDetection || "Not specified";
  document.getElementById("tornadoDamageThreat").textContent =
    parameters.tornadoDamageThreat || "None";

  const expiresDate = new Date(warning.properties.expires);
  document.getElementById("expires").textContent = formatDate(expiresDate);

  document.getElementById("alertDetailModal").classList.remove("hidden");
}

function setupFlashingEffect(content) {
  content.classList.add("flashing");

  const indicatorContainer = document.createElement("div");
  indicatorContainer.className = "emergency-indicator";
  content.prepend(indicatorContainer);

  const canvas = document.createElement("canvas");
  canvas.width = 30;
  canvas.height = 30;
  indicatorContainer.appendChild(canvas);

  const ctx = canvas.getContext("2d");

  let isWhite = true;
  const flashInterval = setInterval(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.arc(15, 15, 10, 0, 2 * Math.PI);
    ctx.fillStyle = isWhite ? "white" : "red";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "white";
    ctx.stroke();

    isWhite = !isWhite;
  }, 1000);

  const modal = document.getElementById("warning-detail-modal");
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (
        mutation.attributeName === "style" &&
        modal.style.display === "none"
      ) {
        clearInterval(flashInterval);
        observer.disconnect();
      }
    });
  });

  observer.observe(modal, { attributes: true });
}

function displayWarningDetails(warning) {
  createWarningDetailModal();

  const modal = document.getElementById("warning-detail-modal");
  const content = modal.querySelector(".warning-detail-content");

  content.innerHTML = "";

  const closeButton = document.createElement("span");
  closeButton.className = "close-modal";
  closeButton.innerHTML = "&times;";
  closeButton.onclick = function () {
    modal.style.display = "none";
  };
  content.appendChild(closeButton);

  const eventName = getEventName(warning);
  const eventClass = eventTypes[eventName] || "unknown-event";
  content.className = `warning-detail-content ${eventClass}`;

  const header = document.createElement("div");
  header.className = "detail-section detail-header";

  const emoji = getWarningEmoji(eventName);

  const title = document.createElement("h2");
  title.innerHTML = `${emoji} <span class="event-emoji"></span>${eventName}`;
  header.appendChild(title);

  const areaDesc = document.createElement("h3");
  areaDesc.textContent = warning.properties.areaDesc;
  header.appendChild(areaDesc);

  content.appendChild(header);

  const infoSection = document.createElement("div");
  infoSection.className = "detail-section";

  const infoTitle = document.createElement("h4");
  infoTitle.textContent = "⏱️ Timing & Details";
  infoSection.appendChild(infoTitle);

  const infoContainer = document.createElement("div");
  infoContainer.className = "detail-info";

  const params = warning.properties.parameters || {};
  const details = [
    {
      label: "Issued",
      value: new Date(warning.properties.sent).toLocaleString(),
    },
    {
      label: "Expires",
      value: new Date(warning.properties.expires).toLocaleString(),
    },
  ];

  if (params.eventMotionDescription && params.eventMotionDescription[0]) {
    const motionDesc = params.eventMotionDescription[0];
    if (motionDesc.includes("storm")) {
      const parts = motionDesc.split("...");
      if (parts.length >= 3) {
        const dirSpeed =
          parts[2].split("DEG")[0].trim() +
          "° at " +
          parts[2].split("KT")[0].split("DEG")[1].trim() +
          " kt";
        details.push({ label: "Storm Motion", value: dirSpeed });
      }
    }
  }

  if (params.maxWindGust && params.maxWindGust[0]) {
    details.push({
      label: "Maximum Wind Gust",
      value: params.maxWindGust[0],
      critical: parseInt(params.maxWindGust[0]) >= 70,
    });
  }

  if (params.maxHailSize && params.maxHailSize[0]) {
    details.push({
      label: "Maximum Hail Size",
      value: `${params.maxHailSize[0]} inches`,
      critical: parseFloat(params.maxHailSize[0]) >= 1.5,
    });
  }

  if (params.tornadoDetection && params.tornadoDetection[0]) {
    details.push({
      label: "Tornado Detection",
      value: params.tornadoDetection[0],
      critical: params.tornadoDetection[0].toLowerCase().includes("observed"),
    });
  }

  if (params.tornadoDamageThreat && params.tornadoDamageThreat[0]) {
    details.push({
      label: "Tornado Damage Threat",
      value: params.tornadoDamageThreat[0],
      critical: params.tornadoDamageThreat[0].toLowerCase() !== "possible",
    });
  }

  if (params.thunderstormDamageThreat && params.thunderstormDamageThreat[0]) {
    const tsThreat = params.thunderstormDamageThreat[0];
    details.push({
      label: "Thunderstorm Damage Threat",
      value: tsThreat,
      critical: ["CONSIDERABLE", "DESTRUCTIVE", "CATASTROPHIC"].includes(
        tsThreat.toUpperCase()
      ),
    });
  }

  details.forEach((detail) => {
    if (detail.value) {
      const detailRow = document.createElement("div");
      detailRow.className = "detail-row";

      const label = document.createElement("span");
      label.className = "detail-label";
      label.textContent = detail.label + ": ";

      const value = document.createElement("span");
      value.className = detail.critical
        ? "detail-value critical"
        : "detail-value";
      value.textContent = detail.value;

      detailRow.appendChild(label);
      detailRow.appendChild(value);
      infoContainer.appendChild(detailRow);
    }
  });

  infoSection.appendChild(infoContainer);
  content.appendChild(infoSection);

  if (warning.properties.description) {
    const descSection = document.createElement("div");
    descSection.className = "detail-section";

    const descTitle = document.createElement("h4");
    descTitle.textContent = "📝 Description";
    descSection.appendChild(descTitle);

    const descText = document.createElement("div");
    descText.className = "description-text";
    descText.textContent = warning.properties.description;
    descSection.appendChild(descText);

    content.appendChild(descSection);
  }

  if (warning.properties.instruction) {
    const instrSection = document.createElement("div");
    instrSection.className = "detail-section instructions";

    const instrTitle = document.createElement("h4");
    instrTitle.textContent = "⚠️ Instructions";
    instrSection.appendChild(instrTitle);

    const instrText = document.createElement("div");
    instrText.className = "instruction-text";
    instrText.textContent = warning.properties.instruction;
    instrSection.appendChild(instrText);

    content.appendChild(instrSection);
  }

  if (
    warning.geometry &&
    warning.geometry.type === "Polygon" &&
    warning.geometry.coordinates
  ) {
    const areaSection = document.createElement("div");
    areaSection.className = "detail-section areas";

    const polygonTitle = document.createElement("h4");
    polygonTitle.textContent = "🗺️ Warning Area";
    areaSection.appendChild(polygonTitle);

    const polygonContainer = drawPolygon(
      warning.geometry.coordinates,
      content,
      eventClass
    );
    if (polygonContainer) {
      areaSection.appendChild(polygonContainer);
      content.appendChild(areaSection);
    }
  }

  modal.style.display = "block";
  content.style.animation = "fadeIn 0.3s ease-in-out";

  if (
    eventName === "Tornado Emergency" ||
    eventName === "PDS Tornado Warning"
  ) {
    setupFlashingEffect(content);
  } else {
    content.classList.remove("flashing");
  }

  makeElementDraggable(content);
}

function makeElementDraggable(element) {
  let pos1 = 0,
    pos2 = 0,
    pos3 = 0,
    pos4 = 0;
  const header = element.querySelector(".detail-header") || element;

  if (header) {
    header.style.cursor = "move";
    header.onmousedown = dragMouseDown;
  }

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    element.style.top = element.offsetTop - pos2 + "px";
    element.style.left = element.offsetLeft - pos1 + "px";
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

function getWarningEmoji(eventName) {
  const emojiMap = {
    "Tornado Warning": "🌪️",
    "Observed Tornado Warning": "🌪️",
    "PDS Tornado Warning": "⚠️🌪️",
    "Tornado Emergency": "🚨🌪️",
    "Severe Thunderstorm Warning": "⛈️",
    "Severe Thunderstorm Warning (Considerable)": "⚡⛈️",
    "Severe Thunderstorm Warning (Destructive)": "💥⛈️",
    "Flash Flood Warning": "🌊",
    "Flash Flood Emergency": "🚨🌊",
    "Flood Warning": "💧",
    "Flood Advisory": "💦",
    "Winter Storm Warning": "❄️",
    "Winter Weather Advisory": "🌨️",
    "Ice Storm Warning": "🧊",
    "Blizzard Warning": "☃️❄️",
    "Special Weather Statement": "ℹ️",
    "Tornado Watch": "👀🌪️",
    "Severe Thunderstorm Watch": "👀⛈️",
  };

  return emojiMap[eventName] || "⚠️";
}

function drawPolygon(coordinates, container) {
  if (!coordinates || !coordinates.length) return null;

  const existing = container.querySelector(".polygon-container");
  if (existing) existing.remove();

  const polygonContainer = document.createElement("div");
  polygonContainer.className = "polygon-container";

  const canvas = document.createElement("canvas");
  canvas.width = 300;
  canvas.height = 200;
  polygonContainer.appendChild(canvas);

  const ctx = canvas.getContext("2d");

  const points = coordinates[0];
  if (!points || !points.length) return null;

  if (!points || !points.length) return null;

  let minLat = 90,
    maxLat = -90,
    minLon = 180,
    maxLon = -180;
  points.forEach((point) => {
    const lat = point[0];
    const lon = point[1];
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
  });

  const latPadding = (maxLat - minLat) * 0.1;
  const lonPadding = (maxLon - minLon) * 0.1;
  minLat -= latPadding;
  maxLat += latPadding;
  minLon -= lonPadding;
  maxLon += lonPadding;

  const scaleX = (lon) => {
    return (canvas.width * (lon - minLon)) / (maxLon - minLon);
  };

  const scaleY = (lat) => {
    return canvas.height * (1 - (lat - minLat) / (maxLat - minLat));
  };

  ctx.beginPath();
  ctx.moveTo(scaleX(points[0][1]), scaleY(points[0][0]));

  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(scaleX(points[i][1]), scaleY(points[i][0]));
  }

  ctx.closePath();
  ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "white";
  ctx.stroke();

  return polygonContainer;
}

function getPolygonColor(eventClass) {
  const colorMap = {
    "tornado-warning": "rgba(255, 0, 0, 0.6)",
    "observed-tornado-warning": "rgba(139, 0, 0, 0.6)",
    "pds-tornado-warning": "rgba(128, 0, 128, 0.6)",
    "tornado-emergency": "rgba(255, 192, 203, 0.6)",
    "severe-thunderstorm-warning": "rgba(255, 165, 0, 0.6)",
    "flash-flood-warning": "rgba(0, 100, 0, 0.6)",
    "ice-storm-warning": "rgba(160, 28, 127, 0.6)",
  };

  return colorMap[eventClass] || "rgba(255, 255, 255, 0.3)";
}

setInterval(updateAlertBar, 10);

function getAlertColor(eventName) {
  switch (eventName) {
    case "Tornado Warning":
      return "#FF0000";
    case "Observed Tornado Warning":
      return "#FF00FF";
    case "PDS Tornado Warning":
      return "#FF00FF";
    case "Tornado Emergency":
      return "#FF0080";
    case "Severe Thunderstorm Warning":
    case "Severe Thunderstorm Warning (Considerable)":
    case "Severe Thunderstorm Warning (Destructive)":
      return "#FF8000";
    case "Flash Flood Warning":
      return "#228B22";
    case "Flash Flood Emergency":
      return "#8B0000";
    case "Tornado Watch":
      return "#8B0000";
    case "Severe Thunderstorm Watch":
      return "#DB7093";
    case "Winter Weather Advisory":
      return "#7B68EE";
    case "Winter Storm Warning":
      return "#FF69B4";
    case "Winter Storm Watch":
      return "#6699CC";
    case "Ice Storm Warning":
      return "#8B008B";
    case "Blizzard Warning":
      return "#FF4500";
    case "Special Weather Statement":
      return "#FFE4B5";
    case "High Wind Warning":
      return "#DAA520";
    case "High Wind Watch":
      return "#B8860B";
    case "Wind Advisory":
      return "#D2B48C";
    case "Freezing Fog Advisory":
      return "#008080";
    case "Dense Fog Advisory":
      return "#708090";
    case "Dust Advisory":
      return "#BDB76B";
    default:
      return "rgba(255, 255, 255, 0.9)";
  }
}

const audioElements = {
  TorIssSound: new Audio(
    "https://audio.jukehost.co.uk/ClbCqxfWssr6dlRXqx3lXVqKQPPVeRgQ"
  ),
  TorPDSSound: new Audio(
    "https://audio.jukehost.co.uk/MePPuUhuqZzUMt6vBRqvBYDydDVxNhBi"
  ),
  PDSSVRSound: new Audio(
    "https://audio.jukehost.co.uk/DvWZ5IjakUW0fHpqc3t2ozBS1BGFxDN4"
  ),
  SVRCSound: new Audio(
    "https://audio.jukehost.co.uk/Xkv300KaF6MJghFS9oQ5BMTWfSDle4IW"
  ),
  SVRCNEWSound: new Audio(
    "https://audio.jukehost.co.uk/cAZ0FjIgLrbX8kxErMb6DAKTq0BwKdlz"
  ),
  TORUPG: new Audio(
    "https://audio.jukehost.co.uk/o6LRilMzywJkfY9QVreGyUjobxERtgwV"
  ),
  TOREISS: new Audio(
    "https://audio.jukehost.co.uk/DELgBfmWgrg8lakettLP9mD9nomZaVA3"
  ),
  TOAWatch: new Audio(
    "https://audio.jukehost.co.uk/MZxVbo8EmFP4XP6vTKaGPtUfGIU6IFdK"
  ),
  SVAWatch: new Audio(
    "https://audio.jukehost.co.uk/vOROpwVlXRik9TS2wXvJvtYInR8o2qMQ"
  ),
  TorUpdateSound: new Audio(
    "https://audio.jukehost.co.uk/jeoBTHhj1MqYOke3BPe2rsdShWcAKe5K"
  ),
  TorPDSUpdateSound: new Audio(
    "https://audio.jukehost.co.uk/iUTfKHPTtMU1d8foLsxL4bwoJDM7UnZ1"
  ),
  TorEmergencyUpdateSound: new Audio(
    "https://audio.jukehost.co.uk/pMOZALOjzSE6DmppsYP3DV4enDLVg0I2"
  ),
};

audioElements.TorPDSSound.volume = 0.4;
audioElements.TOREISS.volume = 0.4;
audioElements.TorPDSUpdateSound.volume = 0.4;
audioElements.TorEmergencyUpdateSound.volume = 0.4;

function playSoundById(soundId) {
  const sound = audioElements[soundId];
  if (sound) {
    sound.currentTime = 0;
    sound.play().catch((error) => console.error("Error playing sound:", error));
  } else {
    audioElements.SVRCSound.currentTime = 0;
    audioElements.SVRCSound.play().catch((error) =>
      console.error("Error playing fallback sound:", error)
    );
  }
}

function displayNotification(warning, notificationType = "") {
  if (notificationsMuted) {
    console.log("Notifications are muted. Skipping display.");
    return;
  }
  const eventName = getEventName(warning);
  const messageType = warning.properties?.messageType;

  if (messageType !== "Alert" && messageType !== "Update") {
    return;
  }

  if (messageType === "Alert") {
    notificationType = "NEW WEATHER ALERT:";
  } else if (messageType === "Update") {
    notificationType = "ALERT UPDATED:";
  }

  const counties = formatCountiesNotification(warning.properties.areaDesc);

  const notification = document.createElement("div");
  notification.className = "notification-popup";
  notification.style.bottom = "125px";

  const notificationTypeLabel = document.createElement("div");
  notificationTypeLabel.className = "notification-type-label";
  notificationTypeLabel.textContent = notificationType;
  notification.appendChild(notificationTypeLabel);

  const title = document.createElement("div");
  title.className = "notification-title";
  title.textContent = eventName;

  const countiesSection = document.createElement("div");
  countiesSection.className = "notification-message";
  countiesSection.textContent = counties;

  const expirationElement = document.createElement("div");
  expirationElement.className = "notification-expiration";

  const expirationDate = new Date(warning.properties.expires);
  const timeOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  };
  const formattedExpirationTime = expirationDate.toLocaleString(
    "en-US",
    timeOptions
  );
  expirationElement.textContent = `EXPIRES: ${formattedExpirationTime}`;

  let notificationDuration = 7000;

  if (
    eventName === "Tornado Emergency" ||
    eventName === "PDS Tornado Warning"
  ) {
    notificationDuration = 10000;
  }

  const logo = document.getElementById("pulseLogo");
  if (logo) {
    logo.classList.remove("notification-pulse");

    void logo.offsetWidth;

    logo.classList.add("notification-pulse");

    setTimeout(() => {
      logo.classList.remove("notification-pulse");
    }, 2000);
  }

  const emergencyContainer = document.createElement("div");
  emergencyContainer.className = "emergency-container";
  emergencyContainer.style.display = "flex";
  emergencyContainer.style.alignItems = "center";
  emergencyContainer.style.justifyContent = "flex-end";

  const emergencyAlert = document.createElement("div");
  emergencyAlert.className = "emergency-alert";
  emergencyAlert.style.fontSize = "36px";
  emergencyAlert.style.color = "#fff";

  if (
    eventName === "Tornado Emergency" ||
    eventName === "PDS Tornado Warning"
  ) {
    emergencyAlert.innerHTML =
      "THIS IS AN EXTREMELY DANGEROUS SITUATION. TAKE COVER NOW!";
  } else if (eventName === "Observed Tornado Warning") {
    emergencyAlert.innerHTML = "A TORNADO IS ON THE GROUND! TAKE COVER NOW!";
  } else if (eventName === "Severe Thunderstorm Warning (Destructive)") {
    emergencyAlert.innerHTML = "THESE ARE VERY DANGEROUS STORMS!";
  }

  emergencyContainer.appendChild(emergencyAlert);
  notification.appendChild(emergencyContainer);

  notification.appendChild(title);
  notification.appendChild(countiesSection);
  notification.appendChild(expirationElement);
  document.body.appendChild(notification);

  notification.style.transform = "translateY(100%)";

  let alertColor = getAlertColor(eventName);
  notification.style.backgroundColor = alertColor;
  notification.style.opacity = 1;

  notification.style.transform = "translateY(100%)";
  notification.style.transition =
    "transform 0.75s cubic-bezier(0.4, 0, 0.2, 1)";

  setTimeout(() => {
    notification.style.transform = "translateY(50%)";
  }, -5);

  setTimeout(() => {
    notification.style.transform = "translateY(100%)";
    setTimeout(() => {
      notification.remove();
    }, 500);
  }, notificationDuration);
}

document
  .getElementById("testCustomWarningButton")
  .addEventListener("click", () => {
    const customWarningText =
      document.getElementById("customWarningInput").value;
    if (customWarningText) {
      testNotification(customWarningText);
    } else {
      alert("Please enter a warning to test.");
    }
  });

function isWarningActive(warning) {
  const expirationDate = new Date(warning.properties.expires);
  return expirationDate > new Date();
}

function getEventNameFromText(warningText) {
  if (warningText.includes("Tornado Warning")) {
    if (
      warningText.includes(
        "This is a PARTICULARLY DANGEROUS SITUATION. TAKE COVER NOW!"
      )
    ) {
      return "PDS Tornado Warning";
    } else if (warningText.includes("TORNADO EMERGENCY")) {
      return "Tornado Emergency";
    } else {
      return "Observed Tornado Warning";
    }
  } else if (warningText.includes("Severe Thunderstorm Warning")) {
    if (warningText.includes("THUNDERSTORM DAMAGE THREAT...CONSIDERABLE")) {
      return "Severe Thunderstorm Warning (Considerable)";
    } else if (
      warningText.includes("THUNDERSTORM DAMAGE THREAT...DESTRUCTIVE")
    ) {
      return "Severe Thunderstorm Warning (Destructive)";
    } else {
      return "Severe Thunderstorm Warning";
    }
  } else if (warningText.includes("Flash Flood Warning")) {
    return "Flash Flood Warning";
  } else {
    return "Unknown Event";
  }
}

function extractCounties(warningText) {
  const countyRegex =
    /(?:\* Locations impacted include\.\.\.\s*)([\s\S]*?)(?=\n\n)/;
  const match = warningText.match(countyRegex);
  return match ? match[1].trim() : "N/A";
}

function formatCountiesTopBar(areaDesc) {
  if (!areaDesc) return "Unknown Area";

  const parts = areaDesc.split(";").map((part) => part.trim());

  if (parts.length > 5) {
    return parts.slice(0, 5).join(", ") + "...";
  }

  return parts.join(", ");
}

async function fetchWarnings() {
  try {
    const response = await fetch(
      "https://api.weather.gov/alerts/active?area=MI"
    );
    const data = await response.json();
    const warnings = data.features.filter((feature) =>
      selectedAlerts.has(feature.properties.event)
    );

    let tornadoCount = 0;
    let thunderstormCount = 0;
    let floodCount = 0;
    let winterWeatherCount = 0;

    warnings.forEach((warning) => {
      const eventName = warning.properties.event;
      if (eventName === "Tornado Warning") {
        const detectionType =
          warning.properties.parameters?.tornadoDetection?.[0];
        const damageThreat =
          warning.properties.parameters?.tornadoDamageThreat?.[0];
        if (detectionType === "OBSERVED") {
          if (damageThreat === "CONSIDERABLE") {
            tornadoCount++;
          } else if (damageThreat === "CATASTROPHIC") {
            tornadoCount++;
          } else {
            tornadoCount++;
          }
        } else {
          tornadoCount++;
        }
      } else if (eventName === "Severe Thunderstorm Warning") {
        const damageThreat =
          warning.properties.parameters?.thunderstormDamageThreat?.[0];
        if (damageThreat === "CONSIDERABLE") {
          thunderstormCount++;
        } else if (damageThreat === "DESTRUCTIVE") {
          thunderstormCount++;
        } else {
          thunderstormCount++;
        }
      } else if (eventName === "Flash Flood Warning") {
        floodCount++;
      } else if (eventName === "Winter Weather Advisory") {
        winterWeatherCount++;
      } else if (eventName === "Winter Storm Warning") {
        winterWeatherCount++;
      } else if (eventName === "Winter Storm Watch") {
        winterWeatherCount++;
      }
    });

    tornadoCountElement.textContent = `${labels.tornado}: ${tornadoCount}`;
    thunderstormCountElement.textContent = `${labels.thunderstorm}: ${thunderstormCount}`;
    floodCountElement.textContent = `${labels.flood}: ${floodCount}`;
    winterWeatherCountElement.textContent = `${labels.winter}: ${winterWeatherCount}`;

    warnings.sort(
      (a, b) => new Date(b.properties.sent) - new Date(a.properties.sent)
    );
    activeWarnings = warnings;

    if (warnings.length === 0) {
      const stationIds = Object.keys(MI_STATIONS);
      if (
        stationIds.length > 0 &&
        currentConditions[stationIds[currentStationIndex]]
      ) {
        displayCurrentConditions(stationIds[currentStationIndex]);
      }
    } else {
      updateWarningList();
    }

    const currentWarningIds = new Set(warnings.map((w) => w.id));

    warnings.forEach((warning) => {
      const warningId = warning.id;
      const eventName = getEventName(warning);

      if (!warning.properties || !warning.properties.event) {
        console.warn("Warning is missing properties:", warning);
        return;
      }
      if (!previousWarningIds.has(warningId)) {
        previousWarningIds.add(warningId);
        showNotification(warning);
      } else {
        const previousEvent = previousWarnings.get(warningId);
        if (previousEvent && previousEvent !== eventName) {
          showNotification(warning);
        }
      }

      previousWarnings.set(warningId, eventName);
    });

    for (const id of Array.from(previousWarningIds)) {
      if (!currentWarningIds.has(id)) {
        const prev = previousWarnings.get(id);
        const name = typeof prev === "string" ? prev : getEventName(prev);

        console.log(`⚠️ Warning expired: ${name} (ID: ${id})`);
        notifyWarningExpired(name, id);

        previousWarnings.delete(id);
        previousWarningIds.delete(id);
      }
    }
  } catch (error) {
    console.error("❌ Error fetching warnings:", error);
  }
}

function formatCountiesNotification(areaDesc) {
  if (!areaDesc) return "Unknown Area";

  const parts = areaDesc.split(";").map((part) => part.trim());

  return parts.join(", ");
}

function updateWarningList(warnings) {
  const warningList = document.getElementById("warningList");
  if (!warningList) return;

  // Clear current list
  warningList.innerHTML = "";

  // Create header for the warning list
  const listHeader = document.createElement("div");
  listHeader.className = "warning-list-header";
  listHeader.innerHTML = `
    <h2>Active Warnings <span class="warning-count-badge">${warnings.length}</span></h2>
    <div class="warning-list-controls">
      <button class="list-control-btn sort-btn" title="Sort warnings by time">
        <i class="fa fa-clock"></i> Sort by Time
      </button>
      <button class="list-control-btn filter-btn" title="Filter warnings">
        <i class="fa fa-filter"></i> Filter
      </button>
    </div>
  `;
  warningList.appendChild(listHeader);

  // Group warnings by type
  const warningGroups = {};
  warnings.forEach((warning) => {
    const eventName = warning.properties.event;
    if (!warningGroups[eventName]) {
      warningGroups[eventName] = [];
    }
    warningGroups[eventName].push(warning);
  });

  // Sort groups by severity (predefined order)
  const severityOrder = [
    "Tornado Emergency",
    "PDS Tornado Warning",
    "Observed Tornado Warning",
    "Tornado Warning",
    "Severe Thunderstorm Warning (Destructive)",
    "Severe Thunderstorm Warning (Considerable)",
    "Severe Thunderstorm Warning",
    "Flash Flood Warning",
    "Flash Flood Emergency",
    "Tornado Watch",
    "Severe Thunderstorm Watch",
    "Winter Storm Warning",
    "Ice Storm Warning",
    "Blizzard Warning",
    "Winter Storm Watch",
    "Winter Weather Advisory",
    "High Wind Warning",
    "Wind Advisory",
    "Dense Fog Advisory",
    "Special Weather Statement",
  ];

  // Create a container for warning groups
  const warningGroupsContainer = document.createElement("div");
  warningGroupsContainer.className = "warning-groups-container";
  warningList.appendChild(warningGroupsContainer);

  // Process each group in order of severity
  severityOrder.forEach((eventType) => {
    if (!warningGroups[eventType] || warningGroups[eventType].length === 0)
      return;

    const warnings = warningGroups[eventType];

    // Create group container
    const groupContainer = document.createElement("div");
    groupContainer.className = "warning-group";

    // Add group header
    const groupHeader = document.createElement("div");
    groupHeader.className = `warning-group-header ${getWarningClass(
      eventType
    )}`;
    groupHeader.innerHTML = `
  <div class="group-icon">${getWarningEmoji(eventType)}</div>
  <h3>${eventType} <span class="group-count">${warnings.length}</span></h3>
  <div class="group-toggle"><i class="fa fa-chevron-down"></i></div>
  `;

    groupContainer.appendChild(groupHeader);

    // Create warnings container
    const warningsContainer = document.createElement("div");
    warningsContainer.className = "warnings-container";

    // Sort warnings by expiration (most urgent first)
    warnings.sort((a, b) => {
      const aExpires = new Date(a.properties.expires);
      const bExpires = new Date(b.properties.expires);
      return aExpires - bExpires;
    });

    // Add individual warning cards
    warnings.forEach((warning, index) => {
      const warningCard = createWarningCard(warning, index);
      warningsContainer.appendChild(warningCard);
    });

    groupContainer.appendChild(warningsContainer);
    warningGroupsContainer.appendChild(groupContainer);

    // Add click event to toggle group
    groupHeader.addEventListener("click", () => {
      groupContainer.classList.toggle("collapsed");
      const icon = groupHeader.querySelector(".group-toggle i");
      icon.classList.toggle("fa-chevron-down");
      icon.classList.toggle("fa-chevron-right");
    });
  });

  // Add event listeners for sorting and filtering controls
  const sortBtn = warningList.querySelector(".sort-btn");
  if (sortBtn) {
    sortBtn.addEventListener("click", () => {
      // Implementation for sorting functionality
      console.log("Sort button clicked");
    });
  }

  // No warnings message
  if (warnings.length === 0) {
    const noWarnings = document.createElement("div");
    noWarnings.className = "no-warnings-message";
    noWarnings.innerHTML = `
      <div class="no-warnings-icon">🔍</div>
      <h3>No Active Warnings</h3>
      <p>The monitored area is currently clear of weather warnings.</p>
    `;
    warningList.appendChild(noWarnings);
  }
}

// Helper function to create a warning card
function createWarningCard(warning, index) {
  const properties = warning.properties;
  const eventName = properties.event;
  const counties = formatCountiesNotification(properties.areaDesc);
  const expires = new Date(properties.expires);

  // Calculate time remaining
  const now = new Date();
  const timeRemaining = expires - now;
  const minutesRemaining = Math.floor(timeRemaining / (1000 * 60));

  // Get urgency class based on time remaining
  let urgencyClass = "";
  if (minutesRemaining < 15) {
    urgencyClass = "urgent";
  } else if (minutesRemaining < 30) {
    urgencyClass = "warning";
  }

  // Create card element
  const card = document.createElement("div");
  card.className = `warning-card ${getWarningClass(eventName)} ${urgencyClass}`;
  card.setAttribute("data-warning-index", index);

  // Progress bar for time remaining
  const progressPercentage = Math.min(
    100,
    Math.max(0, (minutesRemaining / 60) * 100)
  );

  card.innerHTML = `
    <div class="card-header">
      <div class="card-emoji">⚠️</div> <!-- Replace with the appropriate emoji for your warning type -->
      <div class="card-title">${eventName}</div>
      <div class="card-urgency-indicator"></div>
    </div>
    <div class="card-body">
      <div class="card-location">
        <i class="fa fa-map-marker-alt"></i> ${counties}
      </div>
      <div class="card-time-remaining">
        <div class="time-bar-container">
          <div class="time-bar" style="width: ${progressPercentage}%"></div>
        </div>
        <div class="time-text">
          <i class="fa fa-clock"></i> 
          <span>${
            minutesRemaining > 0
              ? `${minutesRemaining} min remaining`
              : "Expiring soon"
          }</span>
        </div>
      </div>
      ${
        properties.instruction
          ? `
        <div class="card-instruction">
          <div class="instruction-toggle">Safety Instructions <i class="fa fa-chevron-down"></i></div>
          <div class="instruction-content hidden">${properties.instruction}</div>
        </div>
      `
          : ""
      }
    </div>
    <div class="card-actions">
      <button class="card-btn details-btn" title="View Details">
        <i class="fa fa-info-circle"></i> Details
      </button>
      <button class="card-btn share-btn" title="Share Warning">
        <i class="fa fa-share-alt"></i> Share
      </button>
    </div>
  `;

  // Add event listeners after creating card
  setTimeout(() => {
    // View details button
    const detailsBtn = card.querySelector(".details-btn");
    if (detailsBtn) {
      detailsBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        displayWarningDetails(warning);
      });
    }

    // Toggle instruction visibility
    const instructionToggle = card.querySelector(".instruction-toggle");
    if (instructionToggle) {
      instructionToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        const content = card.querySelector(".instruction-content");
        content.classList.toggle("hidden");
        const icon = instructionToggle.querySelector("i");
        icon.classList.toggle("fa-chevron-down");
        icon.classList.toggle("fa-chevron-up");
      });
    }

    // Make entire card clickable
    card.addEventListener("click", () => {
      showNotification(warning);
    });
  }, 10);

  return card;
}

// Helper function to determine CSS class based on warning type
function getWarningClass(eventName) {
  const eventNameLower = eventName.toLowerCase();

  if (eventNameLower.includes("tornado emergency")) return "tornado-emergency";
  if (eventNameLower.includes("pds tornado")) return "pds-tornado-warning";
  if (eventNameLower.includes("observed tornado"))
    return "observed-tornado-warning";
  if (eventNameLower.includes("tornado warning")) return "tornado-warning";
  if (eventNameLower.includes("destructive"))
    return "severe-thunderstorm-destructive";
  if (eventNameLower.includes("considerable"))
    return "severe-thunderstorm-considerable";
  if (eventNameLower.includes("severe thunderstorm"))
    return "severe-thunderstorm-warning";
  if (eventNameLower.includes("flash flood")) return "flash-flood-warning";
  if (eventNameLower.includes("tornado watch")) return "tornado-watch";
  if (eventNameLower.includes("thunderstorm watch"))
    return "severe-thunderstorm-watch";
  if (eventNameLower.includes("winter storm warning"))
    return "winter-storm-warning";
  if (eventNameLower.includes("winter weather"))
    return "winter-weather-advisory";
  if (eventNameLower.includes("blizzard")) return "blizzard-warning";
  if (eventNameLower.includes("ice storm")) return "ice-storm-warning";

  return "unknown-event";
}

function playSound(soundFile) {
  const audio = new Audio(`Sounds/${soundFile}`);
  audio.play().catch((error) => console.error("Error playing sound:", error));
}

function getCallToAction(eventName) {
  switch (eventName) {
    case "Tornado Warning":
    case "Observed Tornado Warning":
      return "Seek shelter now!";
    case "PDS Tornado Warning":
    case "Tornado Emergency":
      return "Seek shelter now! You are in a life-threatening situation!";
    case "Severe Thunderstorm Warning":
    case "Severe Thunderstorm Warning (Considerable)":
    case "Severe Thunderstorm Warning (Destructive)":
      return "Seek shelter indoors away from windows!";
    case "Flash Flood Warning":
      return "Seek higher ground now!";
    case "Tornado Watch":
    case "Severe Thunderstorm Watch":
    case "Winter Weather Advisory":
    case "Winter Storm Watch":
    case "Blizzard Warning":
    case "Winter Storm Warning":
    case "Ice Storm Warning":
      return "Stay tuned for further info!";
    default:
      return "Take Appropriate Action!";
  }
}

document.getElementById("saveStateButton").addEventListener("click", () => {
  const rawInput = document.getElementById("stateInput").value.toUpperCase();
  window.selectedStates = rawInput
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const stateFipsCodes = window.selectedStates.map((state) => {
    const fipsCode = Object.keys(STATE_FIPS_TO_ABBR).find(
      (key) => STATE_FIPS_TO_ABBR[key] === state
    );
    return fipsCode || "Unknown";
  });

  console.log(`State filter set to: ${window.selectedStates.join(", ")}`);
  console.log(`State FIPS codes set to: ${stateFipsCodes.join(", ")}`);

  updateDashboard();

  if (window.tacticalModeAbort) {
    window.tacticalModeAbort();
  }
  let abort = false;
  window.tacticalModeAbort = () => {
    abort = true;
  };

  (async function tacticalModeLoop() {
    const interval = 5000;
    while (!abort) {
      const start = Date.now();

      await tacticalMode();

      const elapsed = Date.now() - start;
      const remainingTime = Math.max(0, interval - elapsed);

      await new Promise((resolve) => setTimeout(resolve, remainingTime));
    }
  })();
});

let dashboardUpdatePending = false;

document.getElementById("tacticalModeButton").addEventListener("click", () => {
  console.log(
    "Tactical mode button clicked - fetching ALL warnings regardless of SAME codes"
  );

  if (window.tacticalModeAbort) {
    window.tacticalModeAbort();
  }
  let abort = false;
  window.tacticalModeAbort = () => {
    abort = true;
  };

  (async function tacticalModeLoop() {
    const interval = 5000;
    while (!abort) {
      const start = Date.now();

      await tacticalMode(true);
      updateWarningList(activeWarnings);

      const elapsed = Date.now() - start;
      const remainingTime = Math.max(0, interval - elapsed);

      await new Promise((resolve) => setTimeout(resolve, remainingTime));
    }
  })();
});

async function tacticalMode(ignoreSameFilter = false) {
  console.log("🔄 Starting tactical mode fetch cycle...");

  try {
    const previousActiveWarnings = [...activeWarnings];
    const tempActiveWarnings = [];

    if (!window.activeWarningsSet) {
      window.activeWarningsSet = new Set();
    } else {
      window.activeWarningsSet.clear();
    }

    const previousVtecMap = new Map();
    previousActiveWarnings.forEach((warning) => {
      const vtec = warning.properties?.VTEC;
      if (vtec) previousVtecMap.set(vtec, warning);
    });

    const response = await fetch("/api/xmpp-alerts");
    if (!response.ok) {
      console.error(`❌ API response not OK: ${response.status}`);
      return;
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      console.warn("⚠️ No valid alerts data.");
      return;
    }
    updateWarningList(activeWarnings);

    const alertsArray = data;
    const currentWarningIds = new Set();
    let tornadoCount = 0,
      severeThunderstormCount = 0,
      flashFloodCount = 0,
      specialWeatherStatementCount = 0;

    const selectedAlerts = Array.from(
      document.querySelectorAll("#checkboxContainer input:checked")
    ).map((cb) => cb.value);

    const warnings = alertsArray.filter((alert) => {
      if (!alert.properties) return false;
      if (alert.properties.messageType === "Cancel") return false;
      const expires = alert.properties.expires;
      if (expires && new Date(expires) <= new Date()) return false;
      if (!window.selectedStates) {
        window.selectedStates = [];
      }
      const eventType = getEventName(alert);
      if (!selectedAlerts.includes(eventType)) return false;

      if (!ignoreSameFilter) {
        const areaDesc = alert.properties.areaDesc || "";
        const alertSAMECodes = alert.properties?.geocode?.SAME || [];
        const statesFromSAME = alertSAMECodes.map(getStateFromSAME);
        const matchesInputState = statesFromSAME.some((state) =>
          window.selectedStates.includes(state)
        );
        if (!matchesInputState) return false;
      }

      if (/Tornado/.test(eventType)) tornadoCount++;
      else if (/Thunderstorm/.test(eventType)) severeThunderstormCount++;
      else if (/Flood/.test(eventType)) flashFloodCount++;
      else if (/Special Weather Statement/.test(eventType))
        specialWeatherStatementCount++;

      return true;
    });

    warnings.forEach((alert) => {
      const alertId = alert.id || "";
      const normalizedId = (alertId + "").replace(/^(urn:oid:)+/, "urn:oid:");
      alert.normalizedId = normalizedId;
      currentWarningIds.add(normalizedId);
      window.activeWarningsSet.add(normalizedId);
      previousWarnings.set(normalizedId, alert);

      const eventName = getEventName(alert);
      const messageType = alert.properties?.messageType;
      alert.classifiedAs = eventName;

      let notificationType = messageType === "Update" ? "Update" : "New";
      showNotification(alert, eventName, notificationType);
      tempActiveWarnings.push(alert);
    });

    activeWarnings = tempActiveWarnings;

    if (!dashboardUpdatePending) {
      dashboardUpdatePending = true;
      updateDashboard(alertsArray);

      tornadoCountElement.textContent = tornadoCount;
      thunderstormCountElement.textContent = severeThunderstormCount;
      floodCountElement.textContent = flashFloodCount;
      specialWeatherStatementElement.textContent = specialWeatherStatementCount;

      dashboardUpdatePending = false;
    }

    for (const id of Array.from(previousWarningIds)) {
      if (!currentWarningIds.has(id)) {
        const prev = previousWarnings.get(id);
        const name = typeof prev === "string" ? prev : getEventName(prev);
        notifyWarningExpired(name, id);
        previousWarnings.delete(id);
        previousWarningIds.delete(id);
      }
    }

    activeWarnings = activeWarnings.filter((alert) => {
      const exp = alert.properties?.expires;
      return !exp || new Date(exp) > new Date();
    });
  } catch (error) {
    console.error("❌ Error during tactical mode fetch:", error);
  }
}

let currentCityIndex = 0;

const CITY_STATIONS = [
  { city: "Indianapolis", station: "KIND" },
  { city: "Fort Wayne", station: "KFWA" },
  { city: "South Bend", station: "KSBN" },
  { city: "Evansville", station: "KEVV" },
  { city: "Lafayette", station: "KLAF" },
  { city: "Bloomington", station: "KBMG" },
  { city: "Terre Haute", station: "KHUF" },
  { city: "Muncie", station: "KMIE" },
  { city: "Grissom", station: "KGUS" },
  { city: "Gary", station: "KGYY" },
];

const EXTRA_CITIES = [
  { city: "Crawfordsville", station: "KCQW" },
  { city: "Kokomo", station: "KOKK" },
  { city: "Anderson", station: "KAND" },
  { city: "Columbus", station: "KBAK" },
  { city: "Logansport", station: "KOKK" },
];

const WEATHER_ICONS = {
  clear: "https://i.imgur.com/jKEHIsy.png",
  cloudy: "https://i.imgur.com/AcihKAW.png",
  "partly-cloudy": "https://i.imgur.com/37bCqbo.png",
  rain: "https://i.imgur.com/yS8RtPE.png",
  snow: "https://i.imgur.com/yEu5fVZ.png",
  thunderstorm: "https://i.imgur.com/DG1Wz63.png",
  fog: "https://i.imgur.com/uwHDNIA.png",
};

let weatherIndex = 0;
const weatherCities = CITY_STATIONS.concat(EXTRA_CITIES);

function getCardinalDirection(degrees) {
  if (degrees === "N/A") return "N/A";

  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.floor((degrees + 22.5) / 45) % 8;
  return directions[index];
}

const weatherConditionsMap = new Map();

const lastFetchedData = new Map();

async function fetchWeatherForCity(city, station, targetMap = lastFetchedData) {
  try {
    const resp = await fetch(
      `https://api.weather.gov/stations/${station}/observations/latest`
    );
    if (!resp.ok) {
      if (resp.status === 404) {
        console.error(
          `Weather data not found for ${city} (${station}). Skipping...`
        );
      } else {
        throw new Error(`Network error ${resp.status}`);
      }
      return;
    }
    const json = await resp.json();
    const obs = json.properties;

    const tempC = obs.temperature.value;
    const tempF = tempC != null ? ((tempC * 9) / 5 + 32).toFixed(1) : "N/A";

    const text = obs.textDescription.toLowerCase();

    let windSpeed = "N/A";
    if (obs.windSpeed && obs.windSpeed.value !== undefined) {
      windSpeed = (obs.windSpeed.value * 0.621371).toFixed(0);
      console.log(`Wind speed for ${city}: ${windSpeed} MPH`);
    } else {
      console.warn(`No wind speed data for ${city}`);
    }

    const windDirection = obs.windDirection ? obs.windDirection.value : "N/A";
    const cardinalDirection = getCardinalDirection(windDirection);

    let iconUrl = WEATHER_ICONS.clear;
    if (text.includes("thunder")) iconUrl = WEATHER_ICONS.thunderstorm;
    else if (text.includes("rain")) iconUrl = WEATHER_ICONS.rain;
    else if (text.includes("snow")) iconUrl = WEATHER_ICONS.snow;
    else if (text.includes("fog") || text.includes("mist"))
      iconUrl = WEATHER_ICONS.fog;
    else if (text.includes("cloud")) iconUrl = WEATHER_ICONS.cloudy;

    targetMap.set(city, {
      tempF,
      text,
      iconUrl,
      windSpeed,
      cardinalDirection,
    });

    console.log(`Weather data fetched for ${city} at:`, new Date());
  } catch (err) {
    console.error("Weather fetch error:", err);
  }
}

async function fetchAllWeatherData() {
  for (const { city, station } of CITY_STATIONS) {
    try {
      await fetchWeatherForCity(city, station);
    } catch (err) {
      console.error("Weather fetch error for", city, err);
    }
  }

  console.log("Weather data fetched for all cities.");
}

function updateWeatherDisplay() {
  const { city, station } = CITY_STATIONS[currentCityIndex];
  const data = lastFetchedData.get(city);

  if (data) {
    const countiesElement = document.querySelector("#counties");
    const eventTypeElement = document.querySelector("#eventType");

    const { text, tempF, windSpeed, cardinalDirection, iconUrl } = data;

    countiesElement.innerHTML = `
            <img src="${iconUrl}" alt="${text}" style="width:24px;height:24px;vertical-align:middle;">
            ${text.charAt(0).toUpperCase() + text.slice(1)}, ${tempF}\u00B0F
            | Wind: ${cardinalDirection} @ ${windSpeed} mph
        `;
    eventTypeElement.textContent = city;
  }
}

async function rotateCity() {
  if (previousWarnings.size > 0) {
    console.log("Active warnings present. Updating warning dashboard.");
    updateDashboard();
    return;
  }

  const eventTypeBar = document.querySelector(".event-type-bar");
  const countiesElement = document.querySelector("#counties");

  if (!eventTypeBar || !countiesElement) {
    console.error(
      "Required elements (event-type-bar or counties) not found. Cannot perform city rotation."
    );
    return;
  }

  currentCityIndex = (currentCityIndex + 1) % CITY_STATIONS.length;

  const city = CITY_STATIONS[currentCityIndex].city;
  const station = CITY_STATIONS[currentCityIndex].station;

  eventTypeBar.textContent = city;
  eventTypeBar.style.display = "block";

  const weatherData = lastFetchedData.get(city);

  if (!weatherData) {
    await fetchWeatherForCity(city, station);
  }

  const updatedWeatherData = lastFetchedData.get(city);
  if (updatedWeatherData) {
    countiesElement.innerHTML = `
            <img src="${updatedWeatherData.iconUrl}" alt="${
      updatedWeatherData.text
    }" style="width:24px;height:24px;vertical-align:middle;">
            ${
              updatedWeatherData.text.charAt(0).toUpperCase() +
              updatedWeatherData.text.slice(1)
            }, ${updatedWeatherData.tempF}\u00B0F
            | Wind: ${updatedWeatherData.cardinalDirection} @ ${
      updatedWeatherData.windSpeed
    } mph
        `;
  } else {
    console.log("Weather data still not available for city:", city);
  }

  console.log(`City changed to: ${city}`);
}

function showNoWarningDashboard() {
  const warningBar = document.querySelector(".warning-counts");
  if (warningBar) {
    warningBar.classList.remove("show");
    warningBar.classList.add("fade-out");
  }

  const noWarningsBar = document.querySelector(".no-warning-bar");
  if (noWarningsBar) {
    noWarningsBar.classList.remove("fade-out");
    noWarningsBar.classList.add("fade-in");
    noWarningsBar.classList.add("show");
  }

  document.querySelector(".event-type-bar").style.backgroundColor = "#606060";
}

function showWarningDashboard() {
  const noWarningsBar = document.querySelector(".no-warning-bar");
  if (noWarningsBar) {
    noWarningsBar.classList.remove("show");
    noWarningsBar.classList.add("fade-out");
  }

  const warningBar = document.querySelector(".warning-counts");
  if (warningBar) {
    warningBar.classList.remove("fade-out");
    warningBar.classList.add("fade-in");
    warningBar.classList.add("show");
  }
}

function updateDashboard() {
  const expirationElement = document.querySelector("#expiration");
  const eventTypeElement = document.querySelector("#eventType");
  const countiesElement = document.querySelector("#counties");
  const activeAlertsBox = document.querySelector(".active-alerts-box");
  const activeAlertText = document.getElementById("ActiveAlertText");

  if (!Array.isArray(activeWarnings) || activeWarnings.length === 0) {
    expirationElement.textContent = "N/A";
    eventTypeElement.textContent = "";
    countiesElement.textContent = "N/A";
    document.querySelector(".event-type-bar").style.backgroundColor = "#333";

    activeAlertsBox.style.display = "none";
    activeAlertText.textContent = "CURRENT CONDITIONS";

    showNoWarningDashboard();
    return;
  }

  if (
    typeof currentWarningIndex !== "number" ||
    currentWarningIndex >= activeWarnings.length
  ) {
    currentWarningIndex = 0;
  }

  let warning = activeWarnings[currentWarningIndex];

  if (!warning || !warning.properties) {
    console.warn("⚠️ Skipping invalid warning entry:", warning);

    let validFound = false;
    let attempts = 0;
    while (attempts < activeWarnings.length) {
      currentWarningIndex = (currentWarningIndex + 1) % activeWarnings.length;
      const nextWarning = activeWarnings[currentWarningIndex];
      if (nextWarning && nextWarning.properties) {
        warning = nextWarning;
        validFound = true;
        break;
      }
      attempts++;
    }

    if (!validFound) {
      console.warn(
        "⚠️ No valid warnings found. Falling back to current conditions."
      );
      activeWarnings = [];
      showNoWarningDashboard();
      return;
    }
  }

  const { event, areaDesc, expires } = warning.properties;

  const eventName = getEventName(warning);
  const alertColor = getAlertColor(eventName);

  const eventTypeBar = document.querySelector(".event-type-bar");
  if (eventTypeBar) {
    eventTypeBar.style.backgroundColor = alertColor;
  }

  const expirationDate = new Date(expires);

  const timeOptions = { hour: "numeric", minute: "2-digit", hour12: true };
  const fullOptions = {
    timeZoneName: "short",
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  };

  const formattedExpirationTime = expirationDate.toLocaleString(
    "en-US",
    timeOptions
  );
  const fullFormattedExpirationTime = expirationDate.toLocaleString(
    "en-US",
    fullOptions
  );
  const counties = formatCountiesTopBar(areaDesc);

  expirationElement.textContent = `Expires: ${fullFormattedExpirationTime}`;
  eventTypeElement.textContent = eventName;
  countiesElement.textContent = `Counties: ${counties} | Until ${formattedExpirationTime}`;
  activeAlertsBox.style.display = "block";
  activeAlertText.textContent = "ACTIVE ALERTS";

  showWarningDashboard();

  currentWarningIndex = (currentWarningIndex + 1) % activeWarnings.length;
}

let rotateActive = false;

async function startRotatingCities() {
  rotateActive = true;
  await rotateCityWithDelay();
}

function stopRotatingCities() {
  rotateActive = false;
}

async function rotateCityWithDelay() {
  if (rotateActive) {
    await rotateCity();
    await new Promise((resolve) => setTimeout(resolve, 5000));
    if (rotateActive) rotateCityWithDelay();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  updateDashboard();
  fetchAllWeatherData();
  startRotatingCities();
});

let fetchConditionsActive = false;
let fetchInterval, rotateInterval;

document
  .getElementById("animatedToggleButton")
  .addEventListener("click", () => {
    fetchConditionsActive = !fetchConditionsActive;
    const buttonText = fetchConditionsActive
      ? "STOP FETCHING"
      : "FETCH CURRENT CONDITIONS";
    document.getElementById("animatedToggleButton").textContent = buttonText;

    document
      .getElementById("animatedToggleButton")
      .classList.toggle("active", fetchConditionsActive);

    if (fetchConditionsActive) {
      fetchInterval = setInterval(fetchAllWeatherData, 30 * 60 * 1000);
      startRotatingCities();
      fetchAllWeatherData();
      updateDashboard();
    } else {
      clearInterval(fetchInterval);
      updateDashboard();
      stopRotatingCities();
    }
  });
