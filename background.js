/* global browser */

/*
const manifest = browser.runtime.getManifest();
const extname = manifest.name;
*/

const targetConfig = {
  newtab: {
    name: "New Tab",
    action: (tabURL) => {
      browser.tabs.create({
        active: true,
        url: tabURL,
      });
      return true;
    },
  },
  newbgtab: {
    name: "New Background Tab",
    action: (tabURL) => {
      browser.tabs.create({
        active: false,
        url: tabURL,
      });
      return true;
    },
  },
  newwin: {
    name: "New Window",
    action: (tabURL) => {
      browser.windows.create({
        focused: true,
        url: tabURL,
      });
      return true;
    },
  },
  privwin: {
    name: "New Private Window",
    action: (tabURL) => {
      browser.windows.create({
        incognito: true,
        url: tabURL,
      });
      return true;
    },
  },
};

function processHashPart(tabId, tabURL, part) {
  if (part.includes("=")) {
    let subparts = part.split("=");

    switch (subparts[0]) {
      case "botarget":
        if (targetConfig.hasOwnProperty(subparts[1])) {
          return targetConfig[subparts[1]].action(
            tabURL.replace("#botarget=" + subparts[1], ""),
          );
        }
        break;
    }
  }
  return false;
}

function handleWebRequest(requestDetails) {
  if (requestDetails.url.includes("#")) {
    const parts = requestDetails.url.split("#").slice(1);
    for (const part of parts) {
      if (processHashPart(requestDetails.tabId, requestDetails.url, part)) {
        return { cancel: true };
      }
    }
  }
}

browser.webRequest.onBeforeRequest.addListener(
  handleWebRequest,
  { urls: ["*://*/*"], types: ["main_frame"] },
  ["blocking"],
);

async function updateBookmark(bmId, botarget) {
  let tmp = await browser.bookmarks.get(bmId);
  tmp = tmp[0];

  // remove all existing targets
  tmp = tmp.url.replace("#botarget=newtab", "");
  tmp = tmp.replace("#botarget=newbgtab", "");
  tmp = tmp.replace("#botarget=newwin", "");
  tmp = tmp.replace("#botarget=newbgwin", "");
  tmp = tmp.replace("#botarget=privwin", "");
  tmp = tmp.replace("#botarget=privbgwin", "");

  // add new target
  if (botarget !== "") {
    tmp = tmp + "#botarget=" + botarget;
  }

  browser.bookmarks.update(bmId, {
    url: tmp,
  });
}

for (let key in targetConfig) {
  if (targetConfig.hasOwnProperty(key)) {
    browser.menus.create({
      id: key,
      title: targetConfig[key].name,
      contexts: ["bookmark"],
      onclick: (info, tab) => {
        updateBookmark(info.bookmarkId, key);
      },
    });
  }
}

browser.menus.create({
  contexts: ["bookmark"],
  type: "separator",
});

browser.menus.create({
  title: "Reset (No Target)",
  contexts: ["bookmark"],
  onclick: (info, tab) => {
    updateBookmark(info.bookmarkId, "");
  },
});
