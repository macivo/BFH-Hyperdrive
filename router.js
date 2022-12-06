/*
 *  BFH Hyper drive -- Track Editor
 *  Bachelor thesis (BTI3051) 22, Bern University of Applied Sciences
 *  Developer: Mac Müller
 *
 *  router.js:  Getting html-Elements from controller
 *              Then replaced to <main> element of homepage(index.html)
 *
 */
const routes = Object.create(null);
const main = document.getElementsByTagName("main").item(0)

/**
 * Clear and add view to the <main> element of homepage(index.html).
 * @param view - HTML-Elements.
 */
function setView(view) {
    main.textContent = "";
    main.append(view);
    main.classList.remove("fade-out");
    main.classList.add("fade-in");
}

/**
 * Get a view from a controller.
 */
function render() {
    const hash = decodeURI(location.hash).replace("#/", "").split("/");
    const path = "/" + (hash[0] || "");
    if(!routes[path]) {
        const notFound = document.createElement("div");
        notFound.innerHTML = "<h2>404 Not Found</h2><p>Sorry, page not found!</p>";
        setView(notFound);
        return;
    }
    const component = routes[path];
    const param = hash.length > 1 ? hash[1] : "";
    const view = component.render(param);
    setView(view);
    document.title = "BFH Hyperdrive: " + (component.getTitle ? " " + component.getTitle() : " ");
}
window.addEventListener("hashchange", render);

/**
 * Public interface
 * */
export default {
    register: function (path, component) {
        routes[path] = component;
    },
    go: function(path, param) {
         path += param ? "/" + param : "";
         if (location.hash !== "#" + path) {
             location.hash = path;
         } else {
            render();
         }
    }
};