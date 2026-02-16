var encEmail = "a2p3aXR0aWdAZ21haWwuY29t";
const form = document.getElementById("contact");
form.setAttribute("href", "mailto:".concat(atob(encEmail)));
