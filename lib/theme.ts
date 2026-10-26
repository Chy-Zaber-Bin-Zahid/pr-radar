export const THEME_STORAGE_KEY = "prradar:theme";

/**
 * Runs in <head> before the page paints, so the saved theme (or the system one)
 * is applied without a flash of the wrong colors.
 */
export const themeScript = `(function(){var d=document.documentElement,t;try{t=localStorage.getItem('${THEME_STORAGE_KEY}')}catch(e){}if(t!=='light'&&t!=='dark')t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';d.dataset.theme=t})()`;
