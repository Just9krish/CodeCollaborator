import { Router } from "express";
import { executeCode } from "../code-executor";
import { languages } from "@shared/schema";

export function createExecutionRoutes() {
  const router = Router();

  // Execute code
  router.post("/execute", async (req, res) => {
    try {
      const { code, language } = req.body;

      if (!code || !language) {
        return res
          .status(400)
          .json({ message: "Code and language are required" });
      }

      const supportedLanguage = languages.find(lang => lang.id === language);
      if (!supportedLanguage) {
        return res.status(400).json({ message: "Unsupported language" });
      }

      const result = await executeCode(code, language);
      return res.status(200).json(result);
    } catch (error) {
      console.error("Error executing code:", error);
      return res.status(500).json({ message: "Failed to execute code" });
    }
  });

  // Get supported languages
  router.get("/languages", (_req, res) => {
    return res.status(200).json(languages);
  });

  return router;
}
