export function getTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  return (localStorage.getItem("tema") as "dark" | "light") || "dark";
}
export function setTheme(t: "dark" | "light") {
  localStorage.setItem("tema", t);
  document.documentElement.classList.toggle("dark", t === "dark");
}
export const themeScript = `(function(){try{var t=localStorage.getItem('tema')||'dark';if(t==='dark')document.documentElement.classList.add('dark');}catch(e){document.documentElement.classList.add('dark')}})();`;
