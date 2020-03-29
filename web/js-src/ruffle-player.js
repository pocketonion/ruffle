import load_ruffle from "./load-ruffle";
import ruffle_shadow_template from "./shadow-template";
import { lookup_element } from "./register-element";

export let FLASH_MIMETYPE = "application/x-shockwave-flash";
export let FUTURESPLASH_MIMETYPE = "application/futuresplash";
export let FLASH_ACTIVEX_CLASSID = "clsid:D27CDB6E-AE6D-11cf-96B8-444553540000";

const DIMENSION_REGEX = /^\s*(\d+(\.\d+)?(%)?)/;

export class RufflePlayer extends HTMLElement {
    constructor(...args) {
        let self = super(...args);

        self.shadow = self.attachShadow({mode: 'closed'});
        self.shadow.appendChild(ruffle_shadow_template.content.cloneNode(true));

        self.dynamic_styles = self.shadow.getElementById("dynamic_styles");
        self.canvas = self.shadow.getElementById("player");
        self.instance = null;

        self.Ruffle = load_ruffle();

        return self;
    }

    connectedCallback() {
        this.update_styles();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === "width" || name === "height") {
            this.update_styles();
        }
    }

    disconnectedCallback() {
        if (this.instance) {
            this.instance.destroy();
            this.instance = null;
            console.log("Ruffle instance destroyed.");
        }
    }

    update_styles() {
        for (var i = 0; i < this.dynamic_styles.sheet.rules.length; i += 1) {
            this.dynamic_styles.sheet.deleteRule(i);
        }

        if (this.attributes.width) {
            let width = RufflePlayer.html_dimension_to_css_dimension(this.attributes.width.value);
            if (width !== null) {
                this.dynamic_styles.sheet.insertRule(`:host { width: ${width}; }`);
            }
        }

        if (this.attributes.height) {
            let height = RufflePlayer.html_dimension_to_css_dimension(this.attributes.height.value);
            if (height !== null) {
                this.dynamic_styles.sheet.insertRule(`:host { height: ${height}; }`);
            }
        }
    }

    /**
     * Determine if this element is the fallback content of another Ruffle
     * player.
     * 
     * This heurustic assumes Ruffle objects will never use their fallback
     * content. If this changes, then this code also needs to change.
     */
    is_unused_fallback_object() {
        let parent = this.parentNode;
        let element = lookup_element("ruffle-object");

        if (element !== null) {
            do {
                if (parent.nodeName === element.name) {
                    return true;
                }

                parent = parent.parentNode;
            } while (parent != document);
        }

        return false;
    }

    async stream_swf_url(url) {
        //TODO: Actually stream files...
        try {
            if (this.isConnected && !this.is_unused_fallback_object()) {
                let abs_url = new URL(url, window.location.href).toString();
                console.log("Loading SWF file " + url);

                let response = await fetch(abs_url);

                if (response.ok) {
                    let data = await response.arrayBuffer();
                    await this.play_swf_data(data);
                    console.log("Playing " + url);
                } else {
                    console.error("SWF load failed: " + response.status + " " + response.statusText + " for " + url);
                }
            } else {
                console.warn("Ignoring attempt to play a disconnected or suspended Ruffle element");
            }
        } catch (err) {
            console.error("Serious error occured loading SWF file: " + err);
            throw err;
        }
    }

    async play_swf_data(data) {
        if (this.isConnected && !this.is_unused_fallback_object()) {
            console.log("Got SWF data");

            if (this.instance) {
                this.instance.destroy();
                this.instance = null;
                console.log("Ruffle instance destroyed.");
            }

            let Ruffle = await this.Ruffle.catch(function (e) {
                console.error("Serious error loading Ruffle: " + e);
                throw e;
            });
            
            this.instance = Ruffle.new(this.canvas, new Uint8Array(data));
            console.log("New Ruffle instance created.");
        } else {
            console.warn("Ignoring attempt to play a disconnected or suspended Ruffle element");
        }
    }

    /*
     * Copies attributes and children from another element to this player element.
     * Used by the polyfill elements, RuffleObject and RuffleEmbed.
     */
    copy_element(elem) {
        if (elem) {
            for (let attrib of elem.attributes) {
                if (attrib.specified) {
                    // Issue 468: Chrome "Click to Active Flash" box stomps on title attribute
                    if (attrib.name === "title" && attrib.value === "Adobe Flash Player") {
                        continue;
                    }

                    try {
                        this.setAttribute(attrib.name, attrib.value);
                    } catch (err) {
                        // The embed may have invalid attributes, so handle these gracefully.
                        console.warn(`Unable to set attribute ${attrib.name} on Ruffle instance`);
                    }
                }
            }

            for (let node of Array.from(elem.children)) {
                this.appendChild(node);
            }
        }
    }

    /*
     * Converts a dimension attribute on an HTML embed/object element to a valid CSS dimension.
     * HTML element dimensions are unitless, but can also be percentages.
     * Add a 'px' unit unless the value is a percentage.
     * Returns null if this is not a valid dimension.
     */
    static html_dimension_to_css_dimension(attribute) {
        if (attribute) {
            let match = attribute.match(DIMENSION_REGEX);
            if (match) {
                let out = match[1];
                if (!match[3]) {
                    // Unitless -- add px for CSS.
                    out += "px"
                }
                return out;
            }
        }
        return null;
    }
}

/*
 * Returns whether the given filename ends in an "swf" extension.
 */
export function is_swf_filename(filename) {
    return filename && typeof filename === "string" && filename.search(/\.swf\s*$/i) >= 0;
}
