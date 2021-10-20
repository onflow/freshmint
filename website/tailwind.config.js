module.exports = {
  mode: "jit",
  purge: ["./pages/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      backgroundImage: {
        "hero": "url('/images/NFT.jpeg.jpg')",
      },
      height: (theme) => ({
        youtube: "360px"
      }),
      width: (theme) => ({
        youtube: "640px"
      })
    }
  },
  variants: {
    extend: {}
  },
  plugins: []
};
