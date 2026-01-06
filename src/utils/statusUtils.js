export const getStatusIcon = (status) => {
  switch (status) {
    case "COMPLETED":
    case "PROVEN":
    case "SUPPORTS_PARENT":
      return "mdi-check-circle";
    case "FAILED":
    case "DISPROVEN":
    case "REFUTES_PARENT":
      return "mdi-close-circle";
    case "IN_PROGRESS":
    case "RUNNING":
      return "mdi-play-circle-outline";
    case "DATA_UNAVAILABLE":
      return "mdi-alert-circle-outline";
    case "PENDING":
      return "mdi-clock-outline";
    default:
      return "mdi-circle-outline";
  }
};

export const getStatusColor = (status) => {
  switch (status) {
    case "COMPLETED":
    case "PROVEN":
    case "SUPPORTS_PARENT":
      return "success";
    case "FAILED":
    case "DISPROVEN":
    case "REFUTES_PARENT":
      return "error";
    case "IN_PROGRESS":
    case "RUNNING":
      return "info";
    case "DATA_UNAVAILABLE":
      return "warning";
    default:
      return "grey";
  }
};
