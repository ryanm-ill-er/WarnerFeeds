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

let notificationsMuted = false;

let currentTimeZone = "ET";

const warningListElement = document.getElementById("warningList");
const expirationElement = document.getElementById("expiration");
const eventTypeElement = document.getElementById("eventType");
const countiesElement = document.getElementById("counties");

const tornadoCountElement = document.getElementById("tornadoCount");
const thunderstormCountElement = document.getElementById("thunderstormCount");
const floodCountElement = document.getElementById("floodCount");
const winterWeatherCountElement = document.getElementById("winterWeatherCount");
const socket = new WebSocket("");

const alertEventTypes = [
  "INIT",
  "ALERT",
  "UPDATE",
  "CANCEL",
  "OTHER",
  "ALERT_CANCELED",
  "EXPIRE_ALERT",
  "CONTINUE",
  "NEW",
  "EXPIRE",
  "SPECIAL_WEATHER_STATEMENT",
  "EXPIRE_BEFORE_OPEN",
  "message",
];

const cancelTypes = [
  "CANCEL",
  "ALERT_CANCELED",
  "EXPIRE",
  "EXPIRE_ALERT",
  "EXPIRE_BEFORE_OPEN",
];

function initAlertStream() {
  console.log("🔛 Tactical Alert Stream Engaged!");
  const source = new EventSource("/api/xmpp-alerts");

  source.addEventListener("open", () => {
    console.log("✅ SSE Connected at /api/xmpp-alerts");
  });

  source.addEventListener("error", (err) => {
    console.error("❌ SSE Error:", err);
  });

  if (!Array.isArray(alertEventTypes)) {
    console.error("🚨 alertEventTypes is not defined or not an array.");
    return;
  }

  // Handle different event types
  [
    "NEW",
    "UPDATE",
    "INIT",
    "CONTINUE",
    "CANCEL",
    "OTHER",
    "ALERT",
    "ALERT_CANCELED",
  ].forEach((eventType) => {
    source.addEventListener(eventType, (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log(`📩 Received ${eventType} event:`, data);
        HandleAlertPayload(data, eventType);
      } catch (error) {
        console.error(`❌ Error processing ${eventType} event:`, error);
      }
    });
  });
}

/**
 * Extract the core identifier from a VTEC string or alert object
 * @param {string|object} input - VTEC string or alert object with VTEC
 * @returns {string|null} - Core identifier or null if not found
 */
function parseVtecCore(input) {
  if (!input) return null;

  // Handle objects with vtec property or properties.vtec
  if (typeof input === "object") {
    const vtec =
      input.vtec ||
      (input.properties && input.properties.vtec) ||
      (input.properties &&
        input.properties.parameters &&
        input.properties.parameters.VTEC);

    if (Array.isArray(vtec) && vtec.length > 0) {
      return parseVtecCore(vtec[0]);
    } else if (typeof vtec === "string") {
      return parseVtecCore(vtec);
    }
    return null;
  }

  // Handle VTEC string directly
  if (typeof input === "string") {
    const parsed = parseVTEC(input);
    return parsed.core || null;
  }

  return null;
}

function isWarningExpired(warning) {
  if (!warning || !warning.properties || !warning.properties.expires) {
    return false; // Can't determine expiration, assume not expired
  }

  const expiresDate = new Date(warning.properties.expires);
  return expiresDate < new Date();
}

function isAlertTypeSelected(alert) {
  // If selectedAlerts is not defined or not a Set, consider all alerts as selected
  if (!selectedAlerts || !(selectedAlerts instanceof Set)) {
    console.warn(
      "⚠️ selectedAlerts is not defined or not a Set - defaulting to true"
    );
    return true;
  }

  // Handle both string event names and alert objects
  const eventName = typeof alert === "string" ? alert : getEventName(alert);

  // Check if the event name is in the selectedAlerts Set
  return selectedAlerts.has(eventName);
}

function HandleAlertPayload(payload, eventType) {
  console.log("HandleAlertPayload function called.");

  // 1) Unwrap and normalize
  let alerts, type;

  if (Array.isArray(payload)) {
    alerts = payload;
    type = eventType || "NEW";
  } else if (payload.alerts) {
    alerts = payload.alerts;
    type = payload.type || eventType || "NEW";
  } else {
    alerts = [payload];
    type = eventType || "NEW";
  }

  // 2) sanity check
  if (!Array.isArray(alerts) || !type) {
    console.warn("⚠️ Invalid alerts/type after unwrap:", { alerts, type });
    return;
  }
  alerts = alerts.filter((a) => a && typeof a === "object");

  // 3) hand off to TacticalMode
  TacticalMode(alerts, type);
}

function normalizeAlertsFromEvent(event) {
  try {
    if (!event?.data) return [];

    const jsonStr = event.data
      .trim()
      .replace(/,\s*([\]}])/g, "$1")
      .replace(/^[\uFEFF\xA0]+|[\uFEFF\xA0]+$/g, "");

    const parsed = JSON.parse(jsonStr);
    let rawAlerts = [];

    if (parsed?.features && Array.isArray(parsed.features)) {
      rawAlerts = parsed.features;
    } else if (parsed?.feature) {
      rawAlerts = [parsed.feature];
    } else if (Array.isArray(parsed)) {
      rawAlerts = parsed;
    } else if (parsed?.id && parsed?.eventName) {
      rawAlerts = [parsed];
    } else if (parsed?.id && parsed?.type === "CANCEL") {
      rawAlerts = [
        {
          id: parsed.id,
          eventName: "Alert Canceled",
          eventCode: "",
          counties: [],
          office: "",
          action: "",
          vtec: "",
          effective: "",
          expires: "",
          rawText: "",
          geocode: {},
          threats: {},
          source: "cancel_event",
          polygon: null,
          geometry: null,
        },
      ];
    }

    rawAlerts = rawAlerts.filter((a) => a && typeof a === "object");

    return rawAlerts.map((alert) => {
      const props = {
        event: alert.eventName || "Unknown Event",
        areaDesc: Array.isArray(alert.counties)
          ? alert.counties.join("; ")
          : "Unknown area",
        expires: alert.expires || null,
        office: alert.office || null,
        action: alert.action || null,
        vtec: alert.vtec || null,
        effective: alert.effective || null,
        rawText: alert.rawText || null,
        geocode: alert.geocode || {},
        parameters: {},
      };

      if (alert.threats && typeof alert.threats === "object") {
        for (const [key, val] of Object.entries(alert.threats)) {
          props.parameters[key] = Array.isArray(val) ? val : [val];
        }
      }

      if (alert.source) {
        props.parameters.source = [alert.source];
      }

      return {
        id: alert.id || null,
        normalizedId: alert.id || null,
        properties: props,
        geometry: alert.polygon?.type
          ? {
              type: alert.polygon.type,
              coordinates: alert.polygon.coordinates,
            }
          : alert.geometry || null,
      };
    });
  } catch (err) {
    console.error(`❌ normalizeAlertsFromEvent() failed:`, err);
    console.error("Raw event data:", event?.data);
    return [];
  }
}

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
const previousWarnings = new Map();

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
  const shuffledCounties = [...allCounties].sort(() => 0.5 - Math.random());
  const selectedCounties = shuffledCounties.slice(0, countyCount);
  const areaDesc = "TEST - " + selectedCounties.join("; ");

  function generateRandomString(length) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    return Array.from({ length }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length))
    ).join("");
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

  // Prepare description & hazard/source for Tornado Warning variants
  let description = "";

  if (
    eventName === "Tornado Warning" ||
    eventName === "PDS Tornado Warning" ||
    eventName === "Tornado Emergency" ||
    eventName === "Observed Tornado Warning"
  ) {
    if (eventName === "Tornado Warning") {
      parameters.tornadoDamageThreat = ["NONE"];
    } else if (eventName === "PDS Tornado Warning") {
      parameters.tornadoDamageThreat = ["CONSIDERABLE"];
    } else if (eventName === "Tornado Emergency") {
      parameters.tornadoDamageThreat = ["CATASTROPHIC"];
    } else if (eventName === "Observed Tornado Warning") {
      parameters.tornadoDetection = ["OBSERVED"];
    }

    const possibleHazards = [
      "Tornado.",
      "Damaging Tornado.",
      "Deadly Tornado.",
    ];

    const possibleSources = [
      "NATIONAL WEATHER SERVICE RADAR",
      "TRAINED SPOTTER",
      "PUBLIC REPORT",
      "LAW ENFORCEMENT",
      "NWS DOPPLER RADAR",
      "HAM RADIO OPERATOR",
      "OFFICIAL STORM SURVEY",
      "NATIONAL SEVERE WEATHER LAB",
    ];

    const randomHazard =
      possibleHazards[Math.floor(Math.random() * possibleHazards.length)];
    const randomSource =
      possibleSources[Math.floor(Math.random() * possibleSources.length)];

    parameters.hazard = [randomHazard];
    parameters.source = [randomSource];

    description = `HAZARD... ${randomHazard}\nSOURCE... ${randomSource}`;
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
      description: description,
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

function normalizeAlert(alert) {
  if (!alert || typeof alert !== "object") return null;

  const props = alert.properties || {};
  const fallbackEvent = alert.eventName || props.event || "Unknown Event";
  const fallbackArea = Array.isArray(alert.counties)
    ? alert.counties.join("; ")
    : props.areaDesc || "Unknown Area";

  return {
    id: alert.id || props.id || `unknown-${Date.now()}`,
    geometry: alert.geometry || null,
    rawText: alert.rawText || props.rawText || "",
    vtec: alert.vtec || props.vtec || "",
    properties: {
      event: fallbackEvent,
      expires: props.expires || alert.expires || "",
      areaDesc: fallbackArea,
      parameters: props.parameters || alert.threats || {},
      ...props, // keep original props if they exist
    },
  };
}

function updateWarningCounters(warning) {
  if (!warning || !warning.properties || !warning.properties.event) {
    console.warn(
      "⚠️ updateWarningCounters skipped malformed warning:",
      warning
    );
    return;
  }

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
  if (!alert) return "Unknown Event";

  const props =
    alert.properties || alert.feature?.properties || alert.feature || alert;

  const event = props.eventName || props.event || "Unknown Event";

  const tornadoDamageThreat = (alert.tornadoDamageThreat || "").toUpperCase();
  const tornadoDetection = (alert.tornadoDetection || "").toUpperCase();
  const thunderstormDamageThreat = (
    alert.thunderstormDamageThreat || ""
  ).toUpperCase();
  const flashFloodDamageThreat = (
    alert.flashFloodDamageThreat || ""
  ).toUpperCase();

  if (event.includes("Tornado Warning")) {
    if (tornadoDamageThreat === "CATASTROPHIC") return "Tornado Emergency";
    if (tornadoDamageThreat === "CONSIDERABLE") return "PDS Tornado Warning";
    if (tornadoDetection === "OBSERVED") return "Observed Tornado Warning";
    return "Tornado Warning";
  }

  if (event.includes("Severe Thunderstorm Warning")) {
    if (thunderstormDamageThreat === "DESTRUCTIVE")
      return "Severe Thunderstorm Warning (Destructive)";
    if (thunderstormDamageThreat === "CONSIDERABLE")
      return "Severe Thunderstorm Warning (Considerable)";
    return "Severe Thunderstorm Warning";
  }

  if (event.includes("Flash Flood Warning")) {
    if (flashFloodDamageThreat === "CATASTROPHIC")
      return "Flash Flood Emergency";
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

// globals—ensure these live outside any function
const notifiedWarnings = new Map();
let emergencyText = "";

function showNotification(
  warning,
  actionType = "NEW",
  isUpdate = false,
  currentVersion
) {
  const eventName = getEventName(warning);
  const warningId = warning.id.trim().toUpperCase();

  // Use provided version or fall back to other properties
  currentVersion =
    currentVersion ||
    warning.properties.parameters?.NWSheadline?.[0] ||
    warning.properties.sent;

  const hasBeenNotified = notifiedWarnings.has(warningId);

  console.log("⚙️ Processing warning...");
  console.log("Warning Object:", warning);
  console.log(`🆔 ID: ${warningId}`);
  console.log(`📛 Event Name: ${eventName}`);
  console.log(`📤 Action Type: ${actionType}`);
  console.log(`🔁 Already Notified: ${hasBeenNotified}`);
  console.log(`📌 Current Version: ${currentVersion}`);
  console.log(`📦 Raw Warning Object:`, warning);

  // 🛑 Cancel logic first
  if (["CAN", "EXP", "CANX", "CANCEL"].includes(actionType)) {
    cancelAlert(warning.id);
    console.log(`🛑 Alert Cancelled (${actionType}) - ID: ${warningId}`);
    return;
  }

  // 🎯 Determine new vs update vs init
  let isNew = false;
  let isUpdated = false;
  let isInit = false;

  const updateActions = ["CON", "EXT", "EXA", "UPG", "COR", "ROU"];
  const newActions = ["NEW"];
  const initActions = ["INIT"];

  if (newActions.includes(actionType)) {
    isNew = true;
    console.log("🆕 Action indicates this is a NEW alert.");
  } else if (updateActions.includes(actionType)) {
    isUpdated = true;
    console.log("🔄 Action indicates this is an UPDATED alert.");
  } else if (initActions.includes(actionType)) {
    isInit = true;
    console.log("🏁 Action indicates this is an INIT alert.");
  } else if (!hasBeenNotified) {
    isNew = true;
    console.log("🧠 This ID hasn't been notified before. Marking as NEW.");
  } else if (notifiedWarnings.get(warningId) !== currentVersion) {
    isUpdated = true;
    console.log(
      `🔁 Version mismatch (was: ${notifiedWarnings.get(
        warningId
      )}, now: ${currentVersion}). Marking as UPDATED.`
    );
  } else if (previousWarnings.get(warningId) !== eventName) {
    isUpdated = true;
    console.log(
      `🔃 Event name changed (was: ${previousWarnings.get(
        warningId
      )}, now: ${eventName}). Marking as UPDATED.`
    );
  } else {
    console.log(`⚠️ Duplicate/stale alert ignored: ${warningId}`);
    return;
  }

  console.log(
    `✅ Determined notification status — New: ${isNew}, Updated: ${isUpdated}, Init: ${isInit}`
  );

  // 🏷️ Notification label
  let notificationType = "NEW WEATHER ALERT:"; // Default notification type
  if (isInit) {
    notificationType = "INITIALIZED ALERT:";
    // For INIT alerts, just update state without notification
    previousWarnings.set(warningId, eventName);
    notifiedWarnings.set(warningId, currentVersion);
    console.log(`🧠 State updated for ${warningId} (INIT, no notification)`);
    return; // Return early for INIT without showing notification
  } else if (isUpdated) {
    notificationType = "ALERT UPDATED:";
  }

  console.log(`🏷️ Notification Label: ${notificationType}`);

  // 🔊 Pick your fighter
  const soundId = getSoundForEvent(eventName, isUpdated);
  console.log(`🔊 Playing sound ID: ${soundId}`);
  playSoundById(soundId);

  // 🧠 Track state
  previousWarnings.set(warningId, eventName);
  notifiedWarnings.set(warningId, currentVersion);
  console.log(`🧠 State updated for ${warningId}`);

  switch (eventName) {
    case "Severe Thunderstorm Warning (Destructive)":
      emergencyText = "THIS IS A DANGEROUS SITUATION";
      break;
    case "Flash Flood Emergency":
      emergencyText = "SEEK HIGHER GROUND IMMEDIATELY";
      break;
    case "Observed Tornado Warning":
      emergencyText = "A TORNADO IS ON THE GROUND";
      break;
    case "PDS Tornado Warning":
      emergencyText =
        "A LARGE AND EXTREMELY DANGEROUS TORNADO IS ON THE GROUND";
      break;
    case "Tornado Emergency":
      emergencyText = "A VIOLENT AND PERHAPS DEADLY TORNADO IS ON THE GROUND";
      break;
    default:
      emergencyText = "";
  }

  // 🚀 Fire it off
  if (isNotificationQueueEnabled) {
    console.log("🧾 Notification queue enabled — pushing to queue.");
    notificationQueue.push({ warning, notificationType, emergencyText });
    processNotificationQueue();
  } else {
    console.log("⚡ Notification queue disabled — showing directly.");
    displayNotification(warning, notificationType, emergencyText);
  }

  console.log(
    `🔔 Notification shown for ${eventName} (ID: ${warningId}, ${
      isNew ? "New" : "Updated"
    })`
  );
}

function getSoundForEvent(eventName, isUpdated) {
  if (isUpdated) {
    if (eventName.includes("Tornado Emergency"))
      return "TorEmergencyUpdateSound";
    if (eventName.includes("PDS Tornado Warning")) return "TorPDSUpdateSound";
    if (eventName.includes("Tornado Warning")) return "TorUpdateSound";
    return "SVRCSound";
  } else {
    if (eventName.includes("Tornado Emergency")) return "TOREISS";
    if (eventName.includes("PDS Tornado Warning")) return "TorPDSSound";
    if (eventName.includes("Tornado Warning")) return "TorIssSound";
    if (eventName.includes("Destructive")) return "PDSSVRSound";
    if (eventName.includes("Considerable")) return "SVRCNEWSound";
    if (eventName.includes("Severe Thunderstorm Warning")) return "SVRCSound";
    if (eventName.includes("Tornado Watch")) return "TOAWatch";
    if (eventName.includes("Severe Thunderstorm Watch")) return "SVAWatch";
    return "SVRCSound";
  }
}

function displayNotification(warning, notificationType) {
  if (notificationsMuted) return; // no logging, keep it chill

  const eventName = getEventName(warning);
  const description = warning.rawText || warning.properties?.rawText || "";
  const rawAreaDesc = Array.isArray(warning.counties)
    ? warning.counties.join(", ")
    : warning.properties?.areaDesc || "";
  const cleanAreaDesc = rawAreaDesc.replace(/^TEST\s*-\s*/i, "").trim();

  // Build container
  const notification = document.createElement("div");
  notification.className = "notification-popup";

  const counties = cleanAreaDesc
    .split(";")
    .map((c) => c.trim())
    .filter(Boolean);

  notification.style.bottom =
    counties.length > 20 ? "170px" : counties.length > 10 ? "120px" : "70px";

  // Type label
  const typeLabel = document.createElement("div");
  typeLabel.className = "notification-type-label";
  typeLabel.textContent = notificationType;
  notification.appendChild(typeLabel);

  // Title
  const title = document.createElement("div");
  title.className = "notification-title";
  title.textContent = eventName;
  notification.appendChild(title);

  // Area/counties
  const countyDiv = document.createElement("div");
  countyDiv.className = "notification-message";
  countyDiv.textContent = cleanAreaDesc;
  notification.appendChild(countyDiv);

  // Expiration
  const expirationEl = document.createElement("div");
  expirationEl.className = "notification-expiration";
  const expires = new Date(
    warning.expires || warning.properties?.expires || Date.now()
  );
  expirationEl.textContent = `EXPIRES: ${expires.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })}`;
  notification.appendChild(expirationEl);

  if (emergencyText) {
    const emergencyWrapper = document.createElement("div");
    emergencyWrapper.className = "emergency-alert";
    emergencyWrapper.style.display = "flex";
    emergencyWrapper.style.alignItems = "center";
    emergencyWrapper.style.justifyContent = "flex-end"; // aligns icon + text right
    emergencyWrapper.style.gap = "10px"; // space between icon and text
    emergencyWrapper.style.fontSize = "36px";
    emergencyWrapper.style.color = "#FFFFFF";

    const iconDiv = document.createElement("div");
    iconDiv.className = "emergency-icon";

    const iconImg = document.createElement("img");
    iconImg.src = "https://i.postimg.cc/DwFyZb3k/Exclamation.png";
    iconImg.alt = "Emergency Icon";
    iconImg.className = "logo";
    iconImg.id = "pulseLogo";

    iconDiv.appendChild(iconImg);

    const emergencyTextElement = document.createElement("div");
    emergencyTextElement.textContent = emergencyText;

    emergencyWrapper.appendChild(iconDiv);
    emergencyWrapper.appendChild(emergencyTextElement);

    notification.appendChild(emergencyWrapper);
  }

  // Hazard/source for Tornado warnings (using rawText description)
  if (eventName.toLowerCase().includes("tornado")) {
    const haz = (
      description.match(/HAZARD\.{3}\s*([^\n\r]*)/i)?.[1] ||
      warning.tornadoDamageThreat ||
      "N/A"
    ).trim();
    const src = (
      description.match(/SOURCE\.{3}\s*([^\n\r]*)/i)?.[1] || "N/A"
    ).trim();

    // 🔥 Emoji selector for hazard severity/type
    const getHazardEmoji = (hazard) => {
      const h = hazard.toLowerCase();
      if (h.includes("deadly tornado")) return "❗";
      if (h.includes("damaging tornado")) return "❗";
      if (h.includes("tornado")) return "⚠️";
      return "⚠️";
    };

    // 🕵️‍♂️ Emoji selector for source reliability/confirmation
    const getSourceEmoji = (source) => {
      const s = source.toLowerCase();
      if (s.includes("weather spotter")) return "🔍";
      if (s.includes("radar indicated")) return "📡";
      if (s.includes("radar confirmed")) return "📡";
      if (s.includes("public")) return "👁️";
      return "❓";
    };

    const hs = document.createElement("div");
    hs.className = "hazard-source-info";
    hs.innerHTML = `
    <div><strong>HAZARD:</strong> ${getHazardEmoji(haz)}${haz}${getHazardEmoji(haz)}</div>
    <div><strong>SOURCE:</strong> ${getSourceEmoji(src)}${src}${getSourceEmoji(src)}</div>
  `;
    notification.appendChild(hs);
  }

  // Wind/hail for Severe Thunderstorm Warning - prefer new format fields
  if (eventName.toLowerCase().includes("severe thunderstorm warning")) {
    const maxWind =
      warning.threats?.maxWindGust ||
      warning.maxWindGust ||
      warning.properties?.parameters?.maxWindGust?.[0] ||
      "N/A";
    const maxHail =
      warning.threats?.maxHailSize ||
      warning.maxHailSize ||
      warning.properties?.parameters?.maxHailSize?.[0] ||
      "N/A";

    const wh = document.createElement("div");
    wh.className = "wind-hail-info";

    // Separate divs for wind and hail, emoji + text inline
    wh.innerHTML = `
    <div>${getWindEmoji(maxWind)} Wind: ${maxWind}${getWindEmoji(maxWind)}</div>
    <div>${getHailEmoji(maxHail)} Hail: ${maxHail}${getHailEmoji(maxHail)}</div>
  `;

    notification.appendChild(wh);
  }

  // Pulse logo animation
  const logo = document.getElementById("pulseLogo");
  if (logo) {
    logo.classList.remove("notification-pulse");
    void logo.offsetWidth; // trigger reflow for restart animation
    logo.classList.add("notification-pulse");
    setTimeout(() => logo.classList.remove("notification-pulse"), 2000);
  }

  // Append & animate
  document.body.appendChild(notification);
  notification.style.transform = "translateY(100%)";
  notification.style.backgroundColor = getAlertColor(eventName);
  notification.style.opacity = 1;
  notification.style.transition = "transform 0.85s cubic-bezier(0.4,0,0.2,1)";

  setTimeout(() => (notification.style.transform = "translateY(50%)"), 50);

  const duration =
    eventName.toLowerCase().includes("tornado") || eventName.includes("PDS")
      ? 10000
      : 7000;
  setTimeout(() => {
    notification.style.transform = "translateY(100%)";
    setTimeout(() => notification.remove(), 500);
  }, duration);

  updateWarningList(activeWarnings);
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
    return { alert: "N/A", color: "#1F2593" };
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
// Call this after DOMContentLoaded or after activeWarnings is initialized
setInterval(() => {
  updateWarningList(activeWarnings);
}, 30000);

setInterval(updateClock, 1000);
updateClock();

let lastAlertText = "";
let lastAlertColor = "";
let lastWarningsCount = 0;

function updateAlertBar() {
  function darkenColor(color, percent = 20) {
    let r, g, b;

    if (color.startsWith("#")) {
      if (color.length === 7) {
        r = parseInt(color.slice(1, 3), 16);
        g = parseInt(color.slice(3, 5), 16);
        b = parseInt(color.slice(5, 7), 16);
      } else if (color.length === 4) {
        r = parseInt(color[1] + color[1], 16);
        g = parseInt(color[2] + color[2], 16);
        b = parseInt(color[3] + color[3], 16);
      } else {
        return color;
      }

      const factor = (100 - percent) / 100;

      r = Math.floor(r * factor);
      g = Math.floor(g * factor);
      b = Math.floor(b * factor);

      const toHex = (n) => n.toString(16).padStart(2, "0");

      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    return color;
  }

  const highestAlert = getHighestActiveAlert();
  const alertBar = document.getElementById("alertBar");
  const alertText = document.getElementById("highestAlertText");
  const activeAlertsBox = document.querySelector(".active-alerts-box");
  const semicircle = document.querySelector(".semicircle");

  const currentText =
    highestAlert.alert === "N/A"
      ? "MICHIGAN STORM CHASERS"
      : highestAlert.originalAlert
      ? getEventName(highestAlert.originalAlert)
      : highestAlert.alert;
  const currentColor = highestAlert.color || "#1F2593";
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
    alertText.textContent = "MICHIGAN STORM CHASERS";
    alertBar.style.backgroundColor = "#1F2593";
    activeAlertsBox.style.display = "none";
    semicircle.style.background =
      "linear-gradient(to right, rgb(0, 0, 0) 0%, rgba(0, 0, 0, 0) 100%)";
  } else if (highestAlert.alert) {
    alertText.textContent = currentText;
    alertBar.style.backgroundColor = highestAlert.color;

    // Darken glow by 20%
    const darkerGlow = darkenColor(highestAlert.color, 20);
    alertBar.style.setProperty("--glow-color", darkerGlow);

    activeAlertsBox.textContent = "HIGHEST ACTIVE ALERT";
    activeAlertsBox.style.display = "block";
    semicircle.style.background =
      "linear-gradient(to right, rgb(0, 0, 0) 0%, rgba(0, 0, 0, 0) 100%)";
  } else {
    alertText.textContent = "No valid alert found.";
    alertBar.style.backgroundColor = "#606060";
    activeAlertsBox.style.display = "none";
    semicircle.style.background =
      "linear-gradient(to right, rgba(100, 100, 100, 0.7) 0%, rgba(50, 50, 50, 0) 100%)";
  }
}

function darkenColor(hex, percent) {
  const num = parseInt(hex.replace("#", ""), 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;

  r = Math.floor(r * (1 - percent));
  g = Math.floor(g * (1 - percent));
  b = Math.floor(b * (1 - percent));

  return `rgb(${r}, ${g}, ${b})`;
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
  closeButton.onclick = () => {
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

  // New format: use counties array or fallback string
  const areaDescText = Array.isArray(warning.counties)
    ? warning.counties.join(", ")
    : warning.areaDesc || "Area information unavailable";

  const areaDesc = document.createElement("h3");
  areaDesc.textContent = areaDescText;
  header.appendChild(areaDesc);

  content.appendChild(header);

  // Timing & Details section
  const infoSection = document.createElement("div");
  infoSection.className = "detail-section";

  const infoTitle = document.createElement("h4");
  infoTitle.textContent = "⏱️ Timing & Details";
  infoSection.appendChild(infoTitle);

  const infoContainer = document.createElement("div");
  infoContainer.className = "detail-info";

  // For new format, some date fields are at top-level
  const issuedDate = warning.sent ? new Date(warning.sent) : null;
  const expiresDate = warning.expires ? new Date(warning.expires) : null;

  const details = [
    {
      label: "Issued",
      value: issuedDate ? issuedDate.toLocaleString() : "Unknown",
    },
    {
      label: "Expires",
      value: expiresDate ? expiresDate.toLocaleString() : "Unknown",
    },
  ];

  // parameters moved to top-level props
  const params = {
    maxWindGust: warning.maxWindGust,
    maxHailSize: warning.maxHailSize,
    tornadoDetection: warning.tornadoDetection,
    tornadoDamageThreat: warning.tornadoDamageThreat,
    thunderstormDamageThreat: warning.thunderstormDamageThreat,
  };

  if (params.maxWindGust) {
    details.push({
      label: "Maximum Wind Gust",
      value: params.maxWindGust,
      critical: parseInt(params.maxWindGust) >= 70,
    });
  }

  if (params.maxHailSize) {
    // Strip units and parse float
    const hailSizeNum = parseFloat(params.maxHailSize);
    details.push({
      label: "Maximum Hail Size",
      value: params.maxHailSize,
      critical: hailSizeNum >= 1.5,
    });
  }

  if (params.tornadoDetection) {
    details.push({
      label: "Tornado Detection",
      value: params.tornadoDetection,
      critical: params.tornadoDetection.toLowerCase().includes("observed"),
    });
  }

  if (params.tornadoDamageThreat) {
    details.push({
      label: "Tornado Damage Threat",
      value: params.tornadoDamageThreat,
      critical: params.tornadoDamageThreat.toLowerCase() !== "possible",
    });
  }

  if (params.thunderstormDamageThreat) {
    const tsThreat = params.thunderstormDamageThreat.toUpperCase();
    details.push({
      label: "Thunderstorm Damage Threat",
      value: params.thunderstormDamageThreat,
      critical: ["CONSIDERABLE", "DESTRUCTIVE", "CATASTROPHIC"].includes(
        tsThreat
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

  // Description and Instruction from new top-level fields
  if (warning.rawText) {
    const descSection = document.createElement("div");
    descSection.className = "detail-section";

    const descTitle = document.createElement("h4");
    descTitle.textContent = "📝 Description";
    descSection.appendChild(descTitle);

    const descText = document.createElement("pre"); // keep formatting
    descText.className = "description-text";
    descText.textContent = warning.rawText;
    descSection.appendChild(descText);

    content.appendChild(descSection);
  }

  if (warning.instruction) {
    const instrSection = document.createElement("div");
    instrSection.className = "detail-section instructions";

    const instrTitle = document.createElement("h4");
    instrTitle.textContent = "⚠️ Instructions";
    instrSection.appendChild(instrTitle);

    const instrText = document.createElement("div");
    instrText.className = "instruction-text";
    instrText.textContent = warning.instruction;
    instrSection.appendChild(instrText);

    content.appendChild(instrSection);
  }

  // Polygon if present (same as before)
  if (
    warning.polygon &&
    Array.isArray(warning.polygon) &&
    warning.polygon.length > 0
  ) {
    const areaSection = document.createElement("div");
    areaSection.className = "detail-section areas";

    const polygonTitle = document.createElement("h4");
    polygonTitle.textContent = "🗺️ Warning Area";
    areaSection.appendChild(polygonTitle);

    const polygonContainer = drawPolygon(warning.polygon, content, eventClass);
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

  // ✅ Flip [lon, lat] → [lat, lon]
  const rawPoints = coordinates[0];
  const points = rawPoints.map(([lon, lat]) => [lat, lon]);
  if (!points || !points.length) return null;

  let minLat = 90,
    maxLat = -90,
    minLon = 180,
    maxLon = -180;
  points.forEach(([lat, lon]) => {
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
function getWindEmoji(windSpeed) {
  const speed = parseInt(windSpeed, 10);
  if (isNaN(speed)) return "<span class='emoji-animated'>🟢</span>"; // Unknown

  if (speed >= 90) {
    // Destructive winds (≈ EF1 tornadic or major derecho)
    return "<span class='emoji-animated'>🚨</span>";
  }
  if (speed >= 80) {
    // Damaging winds
    return "<span class='emoji-animated'>❗❗</span>";
  }
  if (speed >= 70) {
    // NWS Severe Thunderstorm threshold
    return "<span class='emoji-animated'>❗</span>";
  }
  if (speed >= 60) {
    // Strong non-severe winds / advisory level
    return "<span class='emoji-animated'>⚠️</span>";
  }
  // <39 mph: typical breezes
  return "<span class='emoji-animated'></span>";
}

function getHailEmoji(hailSize) {
  const size = parseFloat(hailSize);
  if (isNaN(size)) return "<span class='emoji-animated'>🟠</span>";

  if (size >= 5.0) {
    // Softball
    return "<span class='emoji-animated'>📀</span>";
  }
  if (size >= 4.0) {
    // Softball
    return "<span class='emoji-animated'>🥎</span>";
  }
  if (size >= 2.75) {
    // Baseball
    return "<span class='emoji-animated'>⚾</span>";
  }
  if (size >= 2.5) {
    // Tennis ball
    return "<span class='emoji-animated'>🎾</span>";
  }
  if (size >= 2.0) {
    // Hen egg
    return "<span class='emoji-animated'>🥚</span>";
  }
  if (size >= 1.75) {
    // Golf ball
    return "<span class='emoji-animated'>⛳</span>";
  }
  if (size >= 1.5) {
    // Walnut/large grape
    return "<span class='emoji-animated'>🍇</span>";
  }
  if (size >= 1.25) {
    // Half-dollar
    return "<span class='emoji-animated'>🪙</span>";
  }
  if (size >= 1.0) {
    // Quarter (NWS severe hail)
    return "<span class='emoji-animated'>🪙</span>";
  }
  if (size >= 0.75) {
    // Penny
    return "<span class='emoji-animated'>🟠</span>";
  }
  // Smaller than pea-sized
  return "<span class='emoji-animated'>🟠</span>";
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

function formatCountiesNotification(areaDesc) {
  if (!areaDesc) return "Unknown Area";

  const parts = areaDesc.split(";").map((part) => part.trim());

  return parts.join(", ");
}

function updateWarningList(warnings) {
  const warningList = document.getElementById("warningList");
  if (!warningList) return;

  warningList.innerHTML = "";

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

  const warningGroups = {};
  warnings
    .filter((w) => w && w.properties && w.properties.event)
    .forEach((warning) => {
      const eventName = getEventName(warning) || "Unknown Event";
      if (!warningGroups[eventName]) {
        warningGroups[eventName] = [];
      }
      warningGroups[eventName].push(warning);
    });

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

  const warningGroupsContainer = document.createElement("div");
  warningGroupsContainer.className = "warning-groups-container";
  warningList.appendChild(warningGroupsContainer);

  severityOrder.forEach((eventType) => {
    if (!warningGroups[eventType] || warningGroups[eventType].length === 0)
      return;

    const warnings = warningGroups[eventType];

    const groupContainer = document.createElement("div");
    groupContainer.className = "warning-group";

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

    const warningsContainer = document.createElement("div");
    warningsContainer.className = "warnings-container";

    warnings.sort((a, b) => {
      const aExpires = new Date(a.properties.expires);
      const bExpires = new Date(b.properties.expires);
      return aExpires - bExpires;
    });

    warnings.forEach((warning, index) => {
      const warningCard = createWarningCard(warning, index);
      warningsContainer.appendChild(warningCard);
    });

    groupContainer.appendChild(warningsContainer);
    warningGroupsContainer.appendChild(groupContainer);

    groupHeader.addEventListener("click", () => {
      groupContainer.classList.toggle("collapsed");
      const icon = groupHeader.querySelector(".group-toggle i");
      icon.classList.toggle("fa-chevron-down");
      icon.classList.toggle("fa-chevron-right");
    });
  });

  const sortBtn = warningList.querySelector(".sort-btn");
  if (sortBtn) {
    sortBtn.addEventListener("click", () => {
      console.log("Sort button clicked");
    });
  }

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

function createWarningCard(warning, index) {
  // pull properties from either root or nested 'properties' obj
  const props = warning.properties || warning;

  // eventName may exist at root or inside properties
  const eventName = warning.eventName || props.event || "Unknown Event";

  // counties can be array at root or string in properties.areaDesc
  const counties = Array.isArray(warning.counties)
    ? warning.counties.join(", ")
    : props.areaDesc || "Unknown Area";

  // expiration date either root or properties
  const expiresStr = warning.expires || props.expires;
  const expires = new Date(expiresStr);

  const now = new Date();
  const timeRemaining = expires - now;
  const minutesRemaining = Math.floor(timeRemaining / (1000 * 60));

  let urgencyClass = "";
  if (minutesRemaining < 15) {
    urgencyClass = "urgent";
  } else if (minutesRemaining < 30) {
    urgencyClass = "warning";
  }

  const card = document.createElement("div");
  card.className = `warning-card ${getWarningClass(eventName)} ${urgencyClass}`;
  card.setAttribute("data-warning-index", index);

  const progressPercentage = Math.min(
    100,
    Math.max(0, (minutesRemaining / 60) * 100)
  );

  card.innerHTML = `
    <div class="card-header">
      <div class="card-emoji">⚠️</div>
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
        props.instruction
          ? `
        <div class="card-instruction">
          <div class="instruction-toggle">Safety Instructions <i class="fa fa-chevron-down"></i></div>
          <div class="instruction-content hidden">${props.instruction}</div>
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

  setTimeout(() => {
    const detailsBtn = card.querySelector(".details-btn");
    if (detailsBtn) {
      detailsBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        displayWarningDetails(warning);
      });
    }

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

    card.addEventListener("click", () => {
      showNotification(warning);
    });
  }, 10);

  return card;
}

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
    const interval = none;
    while (!abort) {
      const start = Date.now();

      await tacticalMode();

      const elapsed = Date.now() - start;
      const remainingTime = Math.max(0, interval - elapsed);

      await new Promise((resolve) => setTimeout(resolve, remainingTime));
    }
  })();
});

document.getElementById("tacticalModeButton").addEventListener("click", () => {
  initAlertStream();
  console.log("Save button clicked. Starting to listen for alerts...");
});

// Event listener for saveStateButton
document.getElementById("saveStateButton").addEventListener("click", () => {
  initAlertStream();
  console.log("Save state button clicked. Starting to listen for alerts...");
});

let dashboardUpdatePending = false;

if (window.tacticalModeAbort) {
  window.tacticalModeAbort();
}

let abort = false;

window.tacticalModeAbort = () => {
  abort = true;
};

(async function tacticalModeLoop() {
  const interval = none;
  while (!abort) {
    const start = Date.now();

    await tacticalMode(true);
    updateWarningList(activeWarnings);

    const elapsed = Date.now() - start;
    const remainingTime = Math.max(0, interval - elapsed);

    await new Promise((resolve) => setTimeout(resolve, remainingTime));
  }
})();

function parseRawAlert(raw) {
  let jsonStr =
    typeof raw === "string" ? raw.replace(/^data:\s*/, "").trim() : null;
  if (!jsonStr) return null;

  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("💥 JSON parse fail:", e, jsonStr);
    return null;
  }
}

function getVTECCore(vtecStr) {
  if (!vtecStr) return null;

  const vtecs = vtecStr
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  if (vtecs.length === 0) return null;

  for (const v of vtecs) {
    const parts = v.split(".");
    if (parts.length >= 5) {
      return parts.slice(2, 6).join(".");
    }
  }

  return vtecs[0];
}

let alertIndex = 0; // To keep track of the current alert index
let alertCycleInterval; // To hold the interval ID

let alertListeningActive = false; // Flag to track if alert listening is active

// Helper: parse VTEC into key components
function parseVTEC(vtec) {
  // format: /O.ACTION.WFO.PHEN.SIG.ETN.YYYYMMDDThhmmZ-.../
  const parts = vtec.replace(/^\//, "").replace(/\/$/, "").split(".");
  if (parts.length < 6) return {};
  const [preamble, action, wfo, phenSig, etn] = [
    parts[0],
    parts[1],
    parts[2],
    parts[3] + "." + parts[4],
    parts[5],
  ];
  return { action, wfo, phenSig, etn, core: `${wfo}_${etn}` };
}

function normalizeAlert(alert) {
  if (!alert.properties) {
    alert.properties = {
      event: alert.eventName || alert.eventCode || "Unknown Event",
      areaDesc: alert.counties?.join(", ") || "Unknown Area",
      expires:
        alert.expires ||
        alert.expiration ||
        new Date(Date.now() + 3600000).toISOString(), // fallback 1 hour from now
    };
  }
  return alert;
}

function TacticalMode(alerts, type = "NEW") {
  console.log("🔄 [Start] Processing tactical mode alerts...");

  activeWarnings = Array.isArray(activeWarnings) ? activeWarnings : [];

  if (!window.previousWarnings) {
    window.previousWarnings = new Map();
  }

  // Get selected alert types from checkboxes
  const selectedAlertTypes = Array.from(
    document.querySelectorAll(
      '#checkboxContainer input[type="checkbox"]:checked'
    )
  ).map((cb) => cb.value);

  // Get selected states (as abbreviations, e.g., ["MI", "IN"])
  const selectedStates = (window.selectedStates && window.selectedStates.length > 0)
    ? window.selectedStates.map(s => s.toUpperCase())
    : ["US"]; // Default to all US if not set

  alerts.forEach((raw) => {
    const alert = raw?.feature || raw;

    if (!alert || typeof alert !== "object") {
      console.warn("⚠️ Skipping non-object alert:", alert);
      return;
    }

    const id = alert.id || alert.properties?.id || alert.eventCode || null;
    const eventName = getEventName(alert);

    if (!id) {
      console.warn(`⚠️ Skipping alert — missing ID entirely`);
      return;
    }

    if (!eventName) {
      console.warn(`⚠️ Skipping alert [${id}] — missing event name`);
      return;
    }

    // --- SAME code logic START ---
    // Extract all SAME/FIPS codes from the alert (may be in geocode.SAME or parameters.SAME)
    let sameCodes = [];
    if (alert.geocode && alert.geocode.SAME) {
      sameCodes = Array.isArray(alert.geocode.SAME)
        ? alert.geocode.SAME
        : [alert.geocode.SAME];
    } else if (
      alert.properties &&
      alert.properties.parameters &&
      alert.properties.parameters.SAME
    ) {
      sameCodes = Array.isArray(alert.properties.parameters.SAME)
        ? alert.properties.parameters.SAME
        : [alert.properties.parameters.SAME];
    }

    // If no SAME codes, allow through (for national alerts), else filter by state
    let passesSameFilter = true;
    if (
      selectedStates.length > 0 &&
      !selectedStates.includes("") &&
      !selectedStates.includes("")
    ) {
      // Only allow alerts with at least one SAME code matching a selected state
      passesSameFilter = sameCodes.some((code) => {
        const stateAbbr = getStateFromSAME(code);
        return selectedStates.includes(stateAbbr);
      });
      if (!passesSameFilter) {
        console.log(
          `⛔ Alert [${eventName}] (${id}) filtered out by SAME/state selection`
        );
        return;
      }
    }
    // --- SAME code logic END ---

    const hasPolygon = !!(
      alert.polygon?.type === "Polygon" &&
      Array.isArray(alert.polygon.coordinates)
    );

    if (!selectedAlertTypes.includes(eventName)) {
      console.log(`⛔ Alert type '${eventName}' not selected`);
      return;
    }

    const normalized = normalizeAlert(alert);

    if (!window.previousWarnings.has(id)) {
      console.log(`📝 Adding to previousWarnings: ${eventName} (${id})`);
      window.previousWarnings.set(id, normalized);
    }

    const existingIndex = activeWarnings.findIndex((w) => w.id === id);
    if (existingIndex >= 0) {
      activeWarnings[existingIndex] = normalized;
      showNotification(normalized, "UPDATE");
    } else {
      activeWarnings.push(normalized);
      showNotification(normalized, "NEW");

      // 🎯 🆕 NEW: Draw polygon if available
      if (hasPolygon) {
        const polygonElem = drawPolygon(
          alert.polygon.coordinates,
          document.body
        ); // Change container if needed
        if (polygonElem) {
          document.body.appendChild(polygonElem); // Add to DOM or wherever your alerts live
        }
      }
    }
  });

  console.log("📦 Active Warnings Summary:");
  console.table(
    activeWarnings.map((w) => ({
      ID: w.id,
      Event: getEventName(w),
      Polygon: !!(
        w.polygon?.type === "Polygon" && Array.isArray(w.polygon.coordinates)
      ),
    }))
  );

  console.log(`✅ [Done] ${activeWarnings.length} active warnings in memory`);
}


function isWarningExpired(warning) {
  if (!warning || !warning.properties || !warning.properties.expires) {
    return false;
  }

  const expiresDate = new Date(warning.properties.expires);
  return expiresDate < new Date();
}

function updateActiveWarningsList() {
  // Clear the current active warnings
  activeWarnings = [];

  // Add all non-expired warnings from previousWarnings to activeWarnings
  if (window.previousWarnings) {
    window.previousWarnings.forEach((warning, id) => {
      if (!isWarningExpired(warning)) {
        activeWarnings.push(warning);
      } else {
        console.log(
          `🕒 Warning ${id} has expired and won't be added to active list`
        );
        // Clean up expired warnings
        window.previousWarnings.delete(id);
      }
    });
  }

  // Update the UI with the current warnings
  updateWarningList(activeWarnings);
  updateHighestAlert();
}

function processNewWarning(warning, action, isUpdate, currentVersion) {
  // Set default action if not provided
  const actionType = action ? action.toUpperCase() : "NEW";

  // For INIT alerts, add them to activeWarnings but don't show notifications
  if (actionType === "INIT") {
    console.log(`🏁 Adding INIT warning to active list: ${warning.id}`);

    // Make sure activeWarnings exists
    if (!Array.isArray(activeWarnings)) {
      activeWarnings = [];
    }

    // Add to active warnings if not already there
    if (!activeWarnings.some((w) => w.id === warning.id)) {
      activeWarnings.push(warning);
    }

    // Update UI without notifications
    updateWarningCounters(warning);
    updateWarningList(activeWarnings);
    updateHighestAlert();
    updateDashboard(warning);
    return;
  }

  // For other types, process normally with notifications
  if (!activeWarnings) {
    activeWarnings = [];
  }

  // Check if warning already exists in activeWarnings
  const existingIndex = activeWarnings.findIndex((w) => w.id === warning.id);
  if (existingIndex >= 0) {
    // Update existing warning
    activeWarnings[existingIndex] = warning;
  } else {
    // Add new warning
    activeWarnings.push(warning);
  }

  updateWarningCounters(warning);
  updateWarningList(activeWarnings);
  updateHighestAlert();
  showNotification(warning, actionType, isUpdate, currentVersion);
  updateDashboard(warning);
}

function getStateFromSAME(sameCode) {
  if (!sameCode) {
    console.warn("⚠️ Missing SAME code:", sameCode);
    return "Unknown";
  }
  if (typeof sameCode !== "string") {
    console.warn("⚠️ Unexpected SAME code type:", sameCode);
    sameCode = String(sameCode);
  }
  if (sameCode.length < 3) {
    console.warn("⚠️ SAME code too short:", sameCode);
    return "Unknown";
  }
  const fips = sameCode.slice(0, 2); // fix here
  return STATE_FIPS_TO_ABBR[fips] || "Unknown";
}

function cancelAlert(id) {
  if (!id) {
    console.warn("⚠️ Attempted to cancel alert with no ID");
    return;
  }

  console.log(`🗑️ Removing warning: ${id}`);

  // Remove from activeWarnings array
  activeWarnings = activeWarnings.filter((warning) => warning.id !== id);

  // Clean up from tracking maps
  if (window.previousWarnings) {
    window.previousWarnings.delete(id);
  }
  if (notifiedWarnings) {
    notifiedWarnings.delete(id);
  }
  if (previousWarningVersions) {
    previousWarningVersions.delete(id);
  }

  // Update UI
  updateWarningList(activeWarnings);
  updateHighestAlert();

  // If no more warnings, show current conditions
  if (activeWarnings.length === 0) {
    showNoWarningDashboard();
  } else {
    updateDashboard();
  }

  console.log(`🧹 Alert ${id} canceled and cleaned up.`);
}
let currentCityIndex = 0;

const CITY_STATIONS = [
  { city: "Detroit", station: "KDTW" },
  { city: "Lansing", station: "KLAN" },
  { city: "Grand Rapids", station: "KGRR" },
  { city: "Kalamazoo", station: "KAZO" },
  { city: "Hillsdale", station: "KJYM" },
  { city: "Flint", station: "KFNT" },
  { city: "Bad Axe", station: "KBAX" },
  { city: "Mount Pleasant", station: "KMOP" },
  { city: "Ludington", station: "KLDM" },
  { city: "Cadillac", station: "KCAD" },
  { city: "Gaylord", station: "KGLR" },
  { city: "Houghton", station: "KCMX" },
  { city: "Marquette", station: "KSAW" },
  { city: "Sault Ste. Marie", station: "KANJ" },
];

const EXTRA_CITIES = [
  { city: "Alpena", station: "KAPN" },
  { city: "Escanaba", station: "KESC" },
  { city: "Ironwood", station: "KIWD" },
  { city: "Traverse City", station: "KTVC" },
  { city: "Saginaw", station: "KHYX" },
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
  if (activeWarnings.length > 0) {
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
    // Instead of directly setting innerHTML, use updateCountiesText
    updateCountiesText(`
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
    `);
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

  document.querySelector(".event-type-bar").style.backgroundColor = "#1F2593";
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

function updateCountiesText(newHTML) {
  const countiesElement = document.querySelector("#counties");

  // First fade out
  countiesElement.classList.add("fade-out");

  // After the fade out completes, update HTML and fade back in
  setTimeout(() => {
    countiesElement.innerHTML = newHTML; // Changed from textContent to innerHTML
    countiesElement.classList.remove("fade-out");

    // Only now that counties text has fully faded out, update the event type
    if (window.pendingEventTypeUpdate) {
      const { newHTML, newBackgroundColor } = window.pendingEventTypeUpdate;
      crossfadeEventTypeBar(newHTML, newBackgroundColor);
      window.pendingEventTypeUpdate = null;
    }
  }, 400); // Match this with your CSS transition duration
}

function crossfadeEventTypeBar(newHTML, newBackgroundColor) {
  const eventTypeBar = document.querySelector(".event-type-bar");

  // Create a temporary overlay element with the same dimensions and position
  const overlay = document.createElement("div");
  overlay.style.position = "absolute";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.backgroundColor =
    newBackgroundColor || eventTypeBar.style.backgroundColor;
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.innerHTML = newHTML;
  overlay.style.opacity = "0";
  overlay.style.transition = "opacity 0.4s ease-in-out";
  overlay.style.zIndex = "1";

  // Make the event type bar a relative container if it's not already
  if (getComputedStyle(eventTypeBar).position !== "relative") {
    eventTypeBar.style.position = "relative";
  }

  // Add the overlay to the event type bar
  eventTypeBar.appendChild(overlay);

  // Start crossfade
  setTimeout(() => {
    overlay.style.opacity = "1";

    // After the crossfade completes, replace the content and remove the overlay
    setTimeout(() => {
      eventTypeBar.innerHTML = newHTML;
      eventTypeBar.style.backgroundColor =
        newBackgroundColor || eventTypeBar.style.backgroundColor;
    }, 400);
  }, 10); // Small delay to ensure the initial opacity is applied
}

function updateDashboard() {
  const expirationElement = document.querySelector("#expiration");
  const eventTypeElement = document.querySelector("#eventType");
  const countiesElement = document.querySelector("#counties");
  const activeAlertsBox = document.querySelector(".active-alerts-box");
  const activeAlertText = document.getElementById("ActiveAlertText");

  if (!Array.isArray(activeWarnings) || activeWarnings.length === 0) {
    expirationElement.textContent = "LOADING...";
    eventTypeElement.textContent = "LOADING...";
    countiesElement.textContent = "LOADING...";
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
  updateCountiesText(
    `Counties: ${counties} | Until ${formattedExpirationTime}`
  );
  eventTypeElement.textContent = eventName;
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
