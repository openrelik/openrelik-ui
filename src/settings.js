const apiServerUrl =
  import.meta.env.VITE_API_SERVER_URL || "http://localhost:8000";
const apiServerVersion = import.meta.env.VITE_API_SERVER_VERSION || "v1";

export default {
  appName: "openrelik",
  apiServerUrl: apiServerUrl,
  apiServerVersion: apiServerVersion,
};
