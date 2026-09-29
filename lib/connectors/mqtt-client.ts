import "server-only";
import mqtt from "mqtt";
import { parseSensorReading, type SensorReading, type WifiZoneActivity } from "./sensor-types";

export class SensorConnectionError extends Error {
  constructor(message: string, public readonly status: number = 502) {
    super(message);
    this.name = "SensorConnectionError";
  }
}

/** Open a short-lived subscription and return the first valid sensor message. */
export async function readMqttSensor(): Promise<SensorReading> {
  const url = process.env.MQTT_URL;
  const topic = process.env.MQTT_SENSOR_TOPIC;
  if (!url || !topic) {
    throw new SensorConnectionError("MQTT_URL dan MQTT_SENSOR_TOPIC belum dikonfigurasi.", 503);
  }
  if (!/^mqtts?:\/\//.test(url)) {
    throw new SensorConnectionError("MQTT_URL harus menggunakan mqtt:// atau mqtts://.", 503);
  }
  const timeout = Number(process.env.MQTT_TIMEOUT_MS ?? 5000);
  if (!Number.isInteger(timeout) || timeout < 100 || timeout > 30000) {
    throw new SensorConnectionError("MQTT_TIMEOUT_MS harus antara 100 dan 30000.", 503);
  }

  const client = mqtt.connect(url, {
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    connectTimeout: timeout,
    reconnectPeriod: 0,
    clean: true,
    manualConnect: true,
  });

  try {
    return await new Promise<SensorReading>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new SensorConnectionError("Waktu tunggu data MQTT habis.", 504));
      }, timeout);
      const fail = (error: SensorConnectionError) => {
        clearTimeout(timer);
        reject(error);
      };
      client.on("error", () => fail(new SensorConnectionError("Koneksi broker MQTT gagal.")));
      client.on("close", () => fail(new SensorConnectionError("Koneksi MQTT terputus.")));
      client.on("connect", () => {
        client.subscribe(topic, { qos: 1 }, (error, granted) => {
          if (error || !granted?.length || granted.some((item) => item.qos === 128)) {
            fail(new SensorConnectionError("Subscription topik MQTT ditolak."));
          }
        });
      });
      client.on("message", (_topic, payload) => {
        try {
          const reading = parseSensorReading(JSON.parse(payload.toString("utf8")));
          clearTimeout(timer);
          resolve(reading);
        } catch {
          fail(new SensorConnectionError("Payload sensor MQTT tidak valid."));
        }
      });
      client.connect();
    });
  } finally {
    await client.endAsync(true);
  }
}

/** Read one WiFi/CSI activity event from a dedicated MQTT topic. */
export async function readMqttWifiActivity(): Promise<WifiZoneActivity> {
  const url = process.env.MQTT_URL;
  const topic = process.env.WIFI_CSI_MQTT_TOPIC;
  if (!url || !topic) throw new SensorConnectionError("Konfigurasi WiFi CSI MQTT belum lengkap.", 503);
  if (!/^mqtts?:\/\//.test(url)) throw new SensorConnectionError("MQTT_URL harus menggunakan mqtt:// atau mqtts://.", 503);
  const timeout = Number(process.env.MQTT_TIMEOUT_MS ?? 5000);
  if (!Number.isInteger(timeout) || timeout < 100 || timeout > 30000) {
    throw new SensorConnectionError("MQTT_TIMEOUT_MS harus antara 100 dan 30000.", 503);
  }
  const client = mqtt.connect(url, {
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    connectTimeout: timeout,
    reconnectPeriod: 0,
    clean: true,
    manualConnect: true,
  });
  try {
    return await new Promise<WifiZoneActivity>((resolve, reject) => {
      const timer = setTimeout(() => reject(new SensorConnectionError("Waktu tunggu data WiFi CSI habis.", 504)), timeout);
      const fail = (message: string, status = 502) => {
        clearTimeout(timer);
        reject(new SensorConnectionError(message, status));
      };
      client.on("error", () => fail("Koneksi broker MQTT gagal."));
      client.on("close", () => fail("Koneksi MQTT terputus."));
      client.on("connect", () => client.subscribe(topic, { qos: 1 }, (error, granted) => {
        if (error || !granted?.length || granted.some((item) => item.qos === 128)) fail("Subscription topik WiFi CSI ditolak.");
      }));
      client.on("message", (receivedTopic, payload) => {
        if (receivedTopic !== topic) return;
        try {
          const input = JSON.parse(payload.toString("utf8")) as Record<string, unknown>;
          const activity = typeof input.activity === "string" ? input.activity.toLowerCase() : "";
          if (
            typeof input.zoneId !== "string" || !input.zoneId.trim() ||
            !["active", "idle", "offline"].includes(activity) ||
            (input.occupied !== undefined && typeof input.occupied !== "boolean")
          ) throw new Error("invalid activity");
          const timestamp = typeof input.timestamp === "string" && Number.isFinite(Date.parse(input.timestamp))
            ? new Date(input.timestamp).toISOString() : new Date().toISOString();
          clearTimeout(timer);
          resolve({
            zoneId: input.zoneId.trim(),
            activity: activity as WifiZoneActivity["activity"],
            occupied: typeof input.occupied === "boolean" ? input.occupied : activity === "active",
            ...(typeof input.peopleCount === "number" && Number.isFinite(input.peopleCount) ? { peopleCount: input.peopleCount } : {}),
            ...(typeof input.confidence === "number" && Number.isFinite(input.confidence) ? { confidence: input.confidence } : {}),
            timestamp,
          });
        } catch {
          fail("Payload WiFi CSI MQTT tidak valid.");
        }
      });
      client.connect();
    });
  } finally {
    await client.endAsync(true);
  }
}
