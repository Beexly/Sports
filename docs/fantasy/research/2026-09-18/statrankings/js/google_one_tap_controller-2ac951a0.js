import { Controller } from "@hotwired/stimulus"

const SUPPRESSED_GOOGLE_MESSAGES = [
  "[GSI_LOGGER]",
  "Not signed in with the identity provider.",
]

export default class extends Controller {
  static targets = ["credentialForm", "credentialInput"]
  static values = { clientId: String }

  connect() {
    if (!this.hasClientIdValue || this.clientIdValue.length === 0) {
      return
    }

    this.loadGoogleScript()
      .then(() => this.initializeGoogleOneTap())
      .catch(() => {})
  }

  disconnect() {
    window.google?.accounts.id.cancel()
  }

  loadGoogleScript() {
    if (window.google?.accounts?.id) {
      return Promise.resolve()
    }

    if (!window.googleOneTapScriptPromise) {
      window.googleOneTapScriptPromise = new Promise((resolve, reject) => {
        const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]')

        if (existing) {
          existing.addEventListener("load", resolve, { once: true })
          existing.addEventListener("error", reject, { once: true })
          return
        }

        const script = document.createElement("script")
        script.src = "https://accounts.google.com/gsi/client"
        script.async = true
        script.defer = true
        script.addEventListener("load", resolve, { once: true })
        script.addEventListener("error", reject, { once: true })
        document.head.appendChild(script)
      })
    }

    return window.googleOneTapScriptPromise
  }

  initializeGoogleOneTap() {
    this.installGoogleConsoleFilter()

    window.google.accounts.id.initialize({
      client_id: this.clientIdValue,
      callback: ({ credential }) => this.submitCredential(credential),
      auto_select: false,
      cancel_on_tap_outside: false,
      context: "signin",
    })

    window.google.accounts.id.prompt()
  }

  submitCredential(credential) {
    if (!credential || !this.hasCredentialInputTarget || !this.hasCredentialFormTarget) {
      return
    }

    this.credentialInputTarget.value = credential
    this.credentialFormTarget.requestSubmit()
  }

  installGoogleConsoleFilter() {
    if (window.googleOneTapConsoleFilterInstalled) {
      return
    }

    ;["error", "info", "log", "warn"].forEach((method) => {
      const originalMethod = console[method]

      console[method] = (...args) => {
        if (this.shouldSuppressGoogleMessage(args)) {
          return
        }

        originalMethod.apply(console, args)
      }
    })

    window.googleOneTapConsoleFilterInstalled = true
  }

  shouldSuppressGoogleMessage(args) {
    const message = args.map((arg) => String(arg)).join(" ")

    return SUPPRESSED_GOOGLE_MESSAGES.some((suppressedMessage) => message.includes(suppressedMessage))
  }
}
