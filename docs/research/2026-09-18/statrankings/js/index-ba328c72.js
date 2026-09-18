// Import and register all your controllers from the importmap via controllers/**/*_controller
//
// Lazy (not eager) loading: a page only ever uses a handful of the 40+
// controllers in this directory, but eager loading fetched, parsed, and
// registered every one of them on every page. Lazy loading registers a
// controller's module the first time its `data-controller` value actually
// appears in the DOM, cutting unused JS out of the initial page weight/parse
// cost (mobile FCP/LCP) without changing behavior once a controller connects.
import { application } from "controllers/application"
import { lazyLoadControllersFrom } from "@hotwired/stimulus-loading"

lazyLoadControllersFrom("controllers", application)
