import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const configPath = path.join(process.cwd(), "config", "config.json");
    
    // Check if config file exists
    if (!fs.existsSync(configPath)) {
      // Fallback to example file
      const examplePath = path.join(process.cwd(), "config", "config.example.json");
      if (fs.existsSync(examplePath)) {
        const content = fs.readFileSync(examplePath, "utf-8");
        return NextResponse.json(JSON.parse(content));
      }
      // Return empty config if neither exists
      return NextResponse.json({
        assistants: [],
        projects: [],
        models: [],
      });
    }

    const content = fs.readFileSync(configPath, "utf-8");
    return NextResponse.json(JSON.parse(content));
  } catch (error) {
    console.error("Error reading config:", error);
    return NextResponse.json(
      { assistants: [], projects: [], models: [] },
      { status: 500 }
    );
  }
}
