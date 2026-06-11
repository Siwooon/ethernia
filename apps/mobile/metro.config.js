const fs = require("fs");
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const appRoot = __dirname;
const appSrcRoot = path.resolve(appRoot, "src");
const config = getDefaultConfig(appRoot);

function resolveSourceFileWithoutExtension(basePath, platform) {
  const platformExtensions = platform ? [`.${platform}.tsx`, `.${platform}.ts`, `.${platform}.jsx`, `.${platform}.js`] : [];
  const extensions = [
    ...platformExtensions,
    ".native.tsx",
    ".native.ts",
    ".tsx",
    ".ts",
    ".native.jsx",
    ".native.js",
    ".jsx",
    ".js",
    ".json",
  ];

  for (const extension of extensions) {
    const candidate = `${basePath}${extension}`;
    if (fs.existsSync(candidate)) return candidate;
  }

  if (fs.existsSync(basePath) && fs.statSync(basePath).isFile()) return basePath;

  if (fs.existsSync(basePath) && fs.statSync(basePath).isDirectory()) {
    for (const extension of extensions) {
      const candidate = path.join(basePath, `index${extension}`);
      if (fs.existsSync(candidate)) return candidate;
    }
  }

  return null;
}

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith("@/")) {
    const sourceFile = resolveSourceFileWithoutExtension(path.resolve(appSrcRoot, moduleName.slice(2)), platform);
    if (sourceFile) return { type: "sourceFile", filePath: sourceFile };
  }

  if (defaultResolveRequest) return defaultResolveRequest(context, moduleName, platform);
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
