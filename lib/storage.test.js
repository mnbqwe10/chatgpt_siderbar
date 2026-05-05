const {
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
