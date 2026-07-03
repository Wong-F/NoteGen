/** Health check service for startup diagnostics. */
class HealthService {
  /**
   * Simple ping for renderer ↔ main connectivity.
   * @returns {{ ok: boolean; message: string }}
   */
  ping() {
    return { ok: true, message: "noteGen is running" };
  }
}

module.exports = { HealthService };
