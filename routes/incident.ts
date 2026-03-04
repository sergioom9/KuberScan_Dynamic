import express, { Request, Response } from "express";
import { Incident } from "../DB/incidents.ts";

const router = express.Router();

router.delete("/", async (req: Request, res: Response) => {
  try {
    const { _id, pod, namespace, id } = req.body;

    if (!_id && !id && !(pod && namespace)) {
      return res.status(400).json({ error: "Missing params" });
    }

    const filter: Record<string, unknown> = {};
    if (_id) filter._id = _id;
    else if (id) filter.id = id;
    else {
      filter.pod = pod;
      filter.namespace = namespace;
    }

    const result = await Incident.deleteOne(filter);

    return res.status(200).json({
      success: true,
      deletedCount: result.deletedCount,
      filter,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: "Internal Server Error",
      details: err?.message,
    });
  }
});

export default router;
