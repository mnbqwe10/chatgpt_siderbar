const {
  getPrompts,
  savePrompt,
  deletePrompt,
  getBlockedSites,
  blockSite,
  unblockSite,
} = require("./storage");

const mockChrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
    },
  },
};

global.chrome = mockChrome;

describe("Storage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getPrompts", () => {
    test("returns empty array when no prompts stored", (done) => {
      mockChrome.storage.local.get.mockImplementation((key, callback) => {
        callback({});
      });
      getPrompts().then((result) => {
        expect(result).toEqual([]);
        done();
      });
    });

    test("returns stored prompts", (done) => {
      const stored = [{ id: "1", name: "Test", template: "Hello {{selected_text}}" }];
      mockChrome.storage.local.get.mockImplementation((key, callback) => {
        callback({ customPrompts: stored });
      });
      getPrompts().then((result) => {
        expect(result).toEqual(stored);
        done();
      });
    });
  });

  describe("savePrompt", () => {
    test("adds prompt to storage", (done) => {
      mockChrome.storage.local.get.mockImplementation((key, callback) => {
        callback({ customPrompts: [] });
      });
      mockChrome.storage.local.set.mockImplementation((obj, callback) => {
        callback && callback();
      });
      const newPrompt = { id: "1", name: "Test", template: "Hi {{selected_text}}" };
      savePrompt(newPrompt).then(() => {
        expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
          { customPrompts: [newPrompt] },
          expect.any(Function)
        );
        done();
      });
    });
  });

  describe("deletePrompt", () => {
    test("removes prompt by id", (done) => {
      const stored = [
        { id: "1", name: "Keep", template: "Keep this" },
        { id: "2", name: "Delete", template: "Delete this" },
      ];
      mockChrome.storage.local.get.mockImplementation((key, callback) => {
        callback({ customPrompts: stored });
      });
      mockChrome.storage.local.set.mockImplementation((obj, callback) => {
        callback && callback();
      });
      deletePrompt("2").then(() => {
        expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
          { customPrompts: [{ id: "1", name: "Keep", template: "Keep this" }] },
          expect.any(Function)
        );
        done();
      });
    });
  });

  describe("getBlockedSites", () => {
    test("returns empty array when no sites blocked", (done) => {
      mockChrome.storage.local.get.mockImplementation((key, callback) => {
        callback({});
      });
      getBlockedSites().then((result) => {
        expect(result).toEqual([]);
        done();
      });
    });

    test("returns stored blocked sites", (done) => {
      const sites = ["github.com", "twitter.com"];
      mockChrome.storage.local.get.mockImplementation((key, callback) => {
        callback({ blockedSites: sites });
      });
      getBlockedSites().then((result) => {
        expect(result).toEqual(sites);
        done();
      });
    });
  });

  describe("blockSite", () => {
    test("adds site to blocklist if not already present", (done) => {
      mockChrome.storage.local.get.mockImplementation((key, callback) => {
        callback({ blockedSites: ["github.com"] });
      });
      mockChrome.storage.local.set.mockImplementation((obj, callback) => {
        callback && callback();
      });
      blockSite("twitter.com").then(() => {
        expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
          { blockedSites: ["github.com", "twitter.com"] },
          expect.any(Function)
        );
        done();
      });
    });

    test("does not duplicate site if already blocked", (done) => {
      mockChrome.storage.local.get.mockImplementation((key, callback) => {
        callback({ blockedSites: ["github.com"] });
      });
      mockChrome.storage.local.set.mockImplementation((obj, callback) => {
        callback && callback();
      });
      blockSite("github.com").then(() => {
        expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
          { blockedSites: ["github.com"] },
          expect.any(Function)
        );
        done();
      });
    });
  });

  describe("unblockSite", () => {
    test("removes site from blocklist", (done) => {
      const sites = ["github.com", "twitter.com"];
      mockChrome.storage.local.get.mockImplementation((key, callback) => {
        callback({ blockedSites: sites });
      });
      mockChrome.storage.local.set.mockImplementation((obj, callback) => {
        callback && callback();
      });
      unblockSite("github.com").then(() => {
        expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
          { blockedSites: ["twitter.com"] },
          expect.any(Function)
        );
        done();
      });
    });
  });
});