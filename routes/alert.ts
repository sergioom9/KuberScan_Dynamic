import express, { Request, Response } from "express";
import { Alert } from "../DB/alert.ts";
import { Incident } from "../DB/incidents.ts";
import { Quarantined } from "../DB/quarantined.ts";

const router = express.Router();

const checkForIncident = async (podname: string) => {
  const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);

  const count = await Alert.countDocuments({
    podname,
    time: { $gte: fifteenMinsAgo },
  });

  return count > 2;
};

router.post("/", async (req: Request, res: Response) => {
  try {
    if (
      req.body.output == null ||
      req.body.priority == null ||
      req.body.rule == null ||
      req.body.time == null ||
      req.body.output_fields["container.id"] == null
    ) {
      return res.status(400).json({ error: "Missing params" });
    }

    if (
      req.body.output.includes("cilium") ||
      req.body.output_fields["container.id"] === "host" ||
      req.body.output_fields["container.name"].includes("kube-proxy") ||
      req.body.output_fields["container.name"].includes("pause") ||
      req.body.output_fields["k8s_ns_name"] === "kube-system" ||
      req.body.output_fields["k8s_ns_name"] === "kube-public" ||
      req.body.output_fields["k8s_ns_name"] === "kube-node-lease"
    ) {
      return res.status(400).json({ error: "Alerta no deseada" });
    }

    const pod = req.body.output_fields["k8s.pod.name"];
    const namespace = req.body.output_fields["k8s.ns.name"];
    const containerId = req.body.output_fields["container.id"];

    const alert = new Alert({
      output: req.body.output,
      priority: req.body.priority,
      rule: req.body.rule,
      time: new Date(req.body.time),
      containerid: containerId,
      containername: req.body.output_fields["container.name"],
      podname: pod,
      namespace,
      username: req.body.output_fields["user.name"],
      useruid: req.body.output_fields["cuser.uid"],
    });

    await alert.save();
    if (!alert) {
      return res.status(409).json({ error: "Alert not saved" });
    }

    const incidentDetected = await checkForIncident(pod);

    if (incidentDetected) {
      const existingIncident = await Incident.findOne({ pod, namespace });

      if (existingIncident) {
        existingIncident.alertCount += 1;
        existingIncident.severity = req.body.priority;
        existingIncident.id = containerId;
        await existingIncident.save();
      } else {
        const isQuarantined = await Quarantined.exists({ pod, namespace });
        if(!isQuarantined){ 
          const putQuarantine = await fetch("/pod/quarantine",{
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              pod: pod,
              namespace: namespace
            })
          }}
        const newIncident = new Incident({
          id: containerId,
          pod,
          namespace,
          severity: req.body.priority,
          alertCount: 3,
          status: isQuarantined ? "quarantined" : "open",
        });
        await newIncident.save();
      }
    }

    return res.status(200).json({
      success: true,
      alert,
      incident: incidentDetected,
    });
  } catch (err: Error | any) {
    console.log(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
