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
exports.appRouter = (0, trpc_1.router)({
    health: health_1.healthRouter,
    auth: auth_1.authRouter,
    user: user_1.userRouter,
    guest: guest_1.guestRouter,
    project: project_1.projectRouter,
    file: file_1.fileRouter,
    midi: midi_1.midiRouter,
    stem: stem_1.stemRouter,
});
//# sourceMappingURL=index.js.map