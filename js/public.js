document.addEventListener("DOMContentLoaded", () => {
  const menuButton = document.getElementById("mobileMenuButton");
  const navigation = document.getElementById("mainNavigation");
  const year = document.getElementById("currentYear");

  if (year) {
    year.textContent = new Date().getFullYear();
  }

  if (menuButton && navigation) {
    menuButton.addEventListener("click", () => {
      const isOpen = navigation.classList.toggle("is-open");

      menuButton.setAttribute(
        "aria-expanded",
        String(isOpen)
      );
    });

    navigation.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        navigation.classList.remove("is-open");
        menuButton.setAttribute(
          "aria-expanded",
          "false"
        );
      });
    });
  }
});
