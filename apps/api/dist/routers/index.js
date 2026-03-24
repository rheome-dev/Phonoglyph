"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appRouter = void 0;
const trpc_1 = require("../trpc");
const health_1 = require("./health");
const guest_1 = require("./guest");
const auth_1 = require("./auth");
const user_1 = require("./user");
const project_1 = require("./project");
const file_1 = require("./file");
const midi_1 = require("./midi");
const stem_1 = require("./stem");
const auto_save_1 = require("./auto-save");
const audio_analysis_sandbox_1 = require("./audio-analysis-sandbox");
const asset_1 = require("./asset");
const render_1 = require("./render");
const api_key_1 = require("./api-key");
exports.appRouter = (0, trpc_1.router)({
    health: health_1.healthRouter,
    auth: auth_1.authRouter,
    user: user_1.userRouter,
    guest: guest_1.guestRouter,
    project: project_1.projectRouter,
    file: file_1.fileRouter,
    asset: asset_1.assetRouter,
    midi: midi_1.midiRouter,
    stem: stem_1.stemRouter,
    autoSave: auto_save_1.autoSaveRouter,
    audioAnalysisSandbox: audio_analysis_sandbox_1.audioAnalysisSandboxRouter,
    render: render_1.renderRouter,
    apiKey: api_key_1.apiKeyRouter,
});
//# sourceMappingURL=index.js.map