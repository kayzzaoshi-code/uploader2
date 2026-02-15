/*

   ~ Shota BASED
  > Jangan lupa baca README.md <

*/

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(import.meta.url);

export const loadPlugins = async (dir = path.join(process.cwd(), "plugins")) => {
  const plugins = [];

  if (!fs.existsSync(dir)) {
    console.warn(`Folder '${dir}' tidak ditemukan.`); 
    return plugins;
  }

  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      const subPlugins = await loadPlugins(filePath);
      plugins.push(...subPlugins);
    } else if (filePath.endsWith(".js")) {
      try {

        const pluginUrl = `${pathToFileURL(filePath).href}?update=${Date.now()}`;
        const pluginModule = await import(pluginUrl);

        const plugin = pluginModule.default || pluginModule;
        if (typeof plugin === "function" && Array.isArray(plugin.command)) {
          plugins.push(plugin);
        } else {
          console.warn(`Plugin '${file}' tidak valid (harus function + .command).`);
        }
      } catch (err) {
        console.error(`Gagal memuat plugin di ${filePath}:`, err);
      }
    }
  }

  return plugins;
};

export const handleMessage = async (m, sock, commandText, Obj) => {
  const plugins = await loadPlugins();
  for (const plugin of plugins) {
    if (plugin.command.map(c => c.toLowerCase()).includes(commandText.toLowerCase())) {
      try {
        const { prefix: usedPrefix, ...restOfObj } = Obj;
        const pluginData = {
          sock,
          usedPrefix: usedPrefix, 
          ...restOfObj
        };

        await plugin(m, pluginData);

      } catch (err) {
        console.error(`Error saat menjalankan plugin '${commandText}':`, err);
      }
      break;
    }
  }
};

export const getPluginStats = () => {
  const baseDir = path.join(process.cwd(), "plugins");

  if (!fs.existsSync(baseDir)) {
    return { totalCategory: 0, totalFiles: 0, data: [] };
  }

  const folders = fs.readdirSync(baseDir)
    .filter(f => {
      const fullPath = path.join(baseDir, f);
      return fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
    });

  const result = [];
  let totalFiles = 0;

  for (const folder of folders) {
    try {
      const folderPath = path.join(baseDir, folder);
      const files = fs.readdirSync(folderPath)
        .filter(f => f.match(/\.(js|mjs|cjs)$/));

      totalFiles += files.length;
      result.push({ category: folder, count: files.length });
    } catch (e) {
      console.error(`Gagal membaca folder ${folder}:`, e.message);
    }
  }

  result.sort((a, b) => a.category.localeCompare(b.category));

  return {
    totalCategory: folders.length,
    totalFiles,
    data: result
  };
};