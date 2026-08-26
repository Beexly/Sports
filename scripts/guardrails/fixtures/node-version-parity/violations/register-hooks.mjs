import { registerHooks } from "node:module";
registerHooks({ resolve(spec, ctx, next) { return next(spec, ctx); } });
