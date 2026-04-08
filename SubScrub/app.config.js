const { expo } = require("./app.json");

const DEFAULT_EXPO_OWNER = "livadev";
const DEFAULT_EAS_PROJECT_ID = "614e9950-dfbb-4feb-94fd-a20b87984188";

module.exports = ({ config }) => {
	const baseConfig = config ?? expo;
	const owner = process.env.EXPO_OWNER?.trim() || DEFAULT_EXPO_OWNER;
	const projectId =
		process.env.EAS_PROJECT_ID?.trim() || DEFAULT_EAS_PROJECT_ID;
	const appEnv = process.env.EXPO_PUBLIC_APP_ENV?.trim() || "development";
	const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || "";
	const updatesUrl =
		process.env.EXPO_UPDATES_URL?.trim() ||
		(projectId ? `https://u.expo.dev/${projectId}` : undefined);

	const extra = {
		...(baseConfig.extra ?? {}),
		appEnv,
		apiBaseUrl,
	};

	if (projectId) {
		extra.eas = { projectId };
	}

	return {
		...baseConfig,
		...(owner ? { owner } : {}),
		extra,
		updates: {
			...(baseConfig.updates ?? {}),
			...(updatesUrl ? { url: updatesUrl, enabled: true } : { enabled: false }),
		},
	};
};
