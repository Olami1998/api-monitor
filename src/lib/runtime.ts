import { queueDueMonitors } from "@/lib/scheduler";
import { processQueuedRuns } from "@/lib/worker";

const globalRuntime = globalThis as unknown as {
  monitorRuntimeStarted?: boolean;
  monitorRuntimeTimer?: ReturnType<typeof setInterval>;
};

function schedulerEnabled() {
  if (process.env.ENABLE_SCHEDULER === "true") return true;
  if (process.env.ENABLE_SCHEDULER === "false") return false;
  return process.env.NODE_ENV === "production";
}

export function kickWorker() {
  void processQueuedRuns().catch((error) => {
    console.error("[monitor-runtime]", error);
  });
}

export function startRuntime() {
  if (globalRuntime.monitorRuntimeStarted) return;
  globalRuntime.monitorRuntimeStarted = true;

  if (!schedulerEnabled()) {
    return;
  }

  const tick = async () => {
    try {
      await queueDueMonitors();
      await processQueuedRuns();
    } catch (error) {
      console.error("[monitor-runtime]", error);
    }
  };

  void tick();
  globalRuntime.monitorRuntimeTimer ??= setInterval(() => {
    void tick();
  }, 5000);
  globalRuntime.monitorRuntimeTimer.unref?.();
}
