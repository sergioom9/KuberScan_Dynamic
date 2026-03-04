export type FalcoAlert = {
  output: string;
  containerid: string;
  containername: string;
  podname: string;
  namespace: string;
  username: string;
  useruid: string;
  priority: string;
  rule: string;
  time: string;
  source: string;
  tags: string[];
};

export type QuarantineType = {
  pod: string;
  namespace: string;
};

export type IncidentType = {
  _id?: string;
  id: string;
  pod: string;
  namespace: string;
  severity: string;
  alertCount: number;
  status: "open" | "quarantined" | "deleted";
};
