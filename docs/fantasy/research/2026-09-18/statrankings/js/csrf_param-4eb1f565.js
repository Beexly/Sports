// The CSRF token as a request-body param, for fetch() calls that write.
//
// CloudFront's origin-request policy forwards only an explicit header
// whitelist to Rails (ops/terraform/modules/cdn/main.tf), and X-CSRF-Token
// is not on it -- the list sits at AWS's ten-header cap. A token sent only
// as that header silently never reaches the origin, so Rails rejects the
// request with InvalidAuthenticityToken (a 422 in 0ms, before the action
// runs) on every deployed environment, while the same call passes in
// development and in request specs, where no CDN sits in between. That is
// exactly how the live odds board's preference saves shipped broken:
// every toggle and drag PUT 422'd, and the caller re-rendered the last
// state the server had actually saved.
//
// Spreading this into the JSON body sidesteps the CDN policy entirely:
// Rails' CSRF check reads params[:authenticity_token] natively, the same
// way it reads an HTML form's hidden field, and a JSON body is parsed into
// params before the check runs. Same approach as
// projection_override_controller.js's _csrfParam, where the failure was
// first confirmed live.
export function csrfParam() {
  return { authenticity_token: document.querySelector('meta[name="csrf-token"]')?.content }
}
