const { describe, it, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  AuthService,
  DEV_BYPASS_PHONE,
  SCRIPT_TYPE,
  resolvePhysicalMacAddress,
} = require("../src/services/authService");

const MOCK_INTERFACES = {
  "vEthernet (WSL)": [
    {
      address: "172.24.0.1",
      family: "IPv4",
      internal: false,
      mac: "00:15:5d:00:00:01",
    },
  ],
  以太网: [
    {
      address: "192.168.1.10",
      family: "IPv4",
      internal: false,
      mac: "aa:bb:cc:dd:ee:ff",
    },
  ],
  "Wi-Fi": [
    {
      address: "192.168.1.20",
      family: "IPv4",
      internal: false,
      mac: "11:22:33:44:55:66",
    },
  ],
};

const tmpDirs = [];

function makeTmpDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "notegen-auth-"));
  tmpDirs.push(dir);
  return dir;
}

after(() => {
  for (const dir of tmpDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("AuthService", () => {
  it("persists a stable device id from physical MAC", () => {
    const dir = makeTmpDir();
    const service = new AuthService(dir, {
      networkInterfacesFn: () => MOCK_INTERFACES,
    });
    const first = service.getDeviceId();
    const second = service.getDeviceId();
    assert.equal(first, "AABBCCDDEEFF");
    assert.equal(first, second);
  });

  it("prefers Ethernet MAC over Wi-Fi and skips virtual adapters", () => {
    const mac = resolvePhysicalMacAddress(MOCK_INTERFACES);
    assert.equal(mac, "AABBCCDDEEFF");
  });

  it("maps backend error messages to user-friendly text", () => {
    const service = new AuthService(makeTmpDir());
    assert.equal(service.mapErrorMessage("密钥非法"), "密钥无效");
    assert.equal(service.mapErrorMessage("unknown"), "unknown");
  });

  it("allows dev bypass login without secret in dev mode", async () => {
    const service = new AuthService(makeTmpDir(), { isDev: true });
    const result = await service.login({ phone: DEV_BYPASS_PHONE, secret: "" });

    assert.equal(result.ok, true);
    assert.equal(result.session.phone, DEV_BYPASS_PHONE);
    assert.equal(result.session.script, SCRIPT_TYPE);
    assert.equal(result.session.devBypass, true);
    assert.equal(result.session.aipoint, 99999);
  });

  it("does not allow dev bypass in production mode", async () => {
    const service = new AuthService(makeTmpDir(), {
      isDev: false,
      fetchFn: async () => ({
        json: async () => ({ code: 500, msg: "密钥非法", data: null }),
      }),
    });

    const result = await service.login({ phone: DEV_BYPASS_PHONE, secret: "" });
    assert.equal(result.ok, false);
    assert.equal(result.error, "请填写完整信息");
  });

  it("activates via API and stores session", async () => {
    const dir = makeTmpDir();
    const service = new AuthService(dir, {
      isDev: false,
      fetchFn: async (_url, init) => {
        const body = JSON.parse(init.body);
        assert.equal(body.script, SCRIPT_TYPE);
        return {
          json: async () => ({
            code: 200,
            msg: "操作成功",
            data: {
              aipoint: 1500,
              script: SCRIPT_TYPE,
              imei: body.imei,
              phone: body.phone,
              secret: body.secret,
              activeDate: "2026-06-25 10:30:00",
              expireDate: "2099-07-25 10:30:00",
            },
          }),
        };
      },
    });

    const result = await service.login({
      phone: "13800000000",
      secret: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
    });

    assert.equal(result.ok, true);
    assert.equal(result.session.aipoint, 1500);

    const stored = service.readStoredSession();
    assert.equal(stored.phone, "13800000000");
  });

  it("renews expired session with cached credentials", async () => {
    const dir = makeTmpDir();
    const service = new AuthService(dir, {
      isDev: false,
      fetchFn: async () => ({
        json: async () => ({
          code: 200,
          msg: "操作成功",
          data: {
            aipoint: 800,
            script: SCRIPT_TYPE,
            imei: "device-1",
            phone: "13800000001",
            secret: "secret-1",
            activeDate: "2026-01-01 00:00:00",
            expireDate: "2099-12-31 23:59:59",
          },
        }),
      }),
    });

    service.writeSession({
      phone: "13800000001",
      secret: "secret-1",
      script: SCRIPT_TYPE,
      imei: "device-1",
      aipoint: 100,
      activeDate: "2026-01-01 00:00:00",
      expireDate: "2020-01-01 00:00:00",
      loggedInAt: "2020-01-01T00:00:00.000Z",
    });

    const result = await service.getSession();
    assert.equal(result.session?.aipoint, 800);
    assert.equal(result.renewed, true);
  });

  it("clears session when renewal fails", async () => {
    const dir = makeTmpDir();
    const service = new AuthService(dir, {
      isDev: false,
      fetchFn: async () => ({
        json: async () => ({ code: 500, msg: "已过期,请续期", data: null }),
      }),
    });

    service.writeSession({
      phone: "13800000002",
      secret: "secret-2",
      script: SCRIPT_TYPE,
      imei: "device-2",
      aipoint: 100,
      activeDate: "2026-01-01 00:00:00",
      expireDate: "2020-01-01 00:00:00",
      loggedInAt: "2020-01-01T00:00:00.000Z",
    });

    const result = await service.getSession();
    assert.equal(result.session, null);
    assert.equal(result.error, "密钥已过期，请联系管理员续期");
    assert.equal(service.readStoredSession(), null);
  });

  it("logout clears stored session", () => {
    const dir = makeTmpDir();
    const service = new AuthService(dir);
    service.writeSession({
      phone: "13800000003",
      secret: "secret-3",
      script: SCRIPT_TYPE,
      imei: "device-3",
      aipoint: 100,
      activeDate: "2026-06-25 10:30:00",
      expireDate: "2099-07-25 10:30:00",
      loggedInAt: new Date().toISOString(),
    });

    service.logout();
    assert.equal(service.readStoredSession(), null);
  });

  it("saves, reads, and clears remembered credentials", () => {
    const service = new AuthService(makeTmpDir());
    assert.equal(service.readSavedCredentials(), null);

    service.saveCredentials(" 13800000000 ", " secret-x ");
    assert.deepEqual(service.readSavedCredentials(), {
      phone: "13800000000",
      secret: "secret-x",
    });

    service.clearCredentials();
    assert.equal(service.readSavedCredentials(), null);
    service.clearCredentials();
  });

  it("returns null for corrupt saved credentials file", () => {
    const dir = makeTmpDir();
    const service = new AuthService(dir);
    fs.writeFileSync(service.credentialsPath, "not json", "utf8");
    assert.equal(service.readSavedCredentials(), null);
  });

  it("login with remember=true persists credentials, remember=false clears them", async () => {
    const service = new AuthService(makeTmpDir(), { isDev: true });

    await service.login({ phone: DEV_BYPASS_PHONE, secret: "s1", remember: true });
    assert.deepEqual(service.readSavedCredentials(), {
      phone: DEV_BYPASS_PHONE,
      secret: "s1",
    });

    await service.login({ phone: DEV_BYPASS_PHONE, secret: "s1", remember: false });
    assert.equal(service.readSavedCredentials(), null);
  });

  it("failed login does not touch saved credentials", async () => {
    const service = new AuthService(makeTmpDir(), {
      isDev: false,
      fetchFn: async () => ({
        json: async () => ({ code: 500, msg: "密钥非法", data: null }),
      }),
    });
    service.saveCredentials("13800000009", "old-secret");

    const result = await service.login({ phone: "13800000009", secret: "bad", remember: true });
    assert.equal(result.ok, false);
    assert.deepEqual(service.readSavedCredentials(), {
      phone: "13800000009",
      secret: "old-secret",
    });
  });

  it("builds user profile from session", () => {
    const service = new AuthService(makeTmpDir());
    const profile = service.toUserProfile({
      phone: "13800000000",
      secret: "secret",
      script: SCRIPT_TYPE,
      imei: "device",
      aipoint: 1500,
      activeDate: "2026-06-25 10:30:00",
      expireDate: "2099-07-25 10:30:00",
      loggedInAt: new Date().toISOString(),
    });

    assert.equal(profile.phone, "13800000000");
    assert.equal(profile.subscriptionStatus, "active");
    assert.equal(profile.subscriptionLabel, "有效");
  });
});
