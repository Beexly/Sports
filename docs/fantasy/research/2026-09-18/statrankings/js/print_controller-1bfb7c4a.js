import { Controller } from "@hotwired/stimulus";

// Opens the browser's own print dialog for the current page. Used by the
// Fantasy Rankings export cluster, whose Print button is a plain button rather
// than a link -- there is nothing to navigate to, the page prints itself.
export default class extends Controller {
  print() {
    window.print();
  }
}
