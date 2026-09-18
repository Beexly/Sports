// Avo runs its own Stimulus application (exposed as window.Stimulus), separate
// from the main site's -- controllers pinned under app/javascript/controllers
// aren't loaded on admin pages unless registered here explicitly.
import AnalyticsPollController from "controllers/analytics_poll_controller"

window.Stimulus.register("analytics-poll", AnalyticsPollController)
