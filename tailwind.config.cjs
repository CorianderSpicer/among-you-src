module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#060914', deep: '#0b1124', hull: '#121a33', panel: '#17213f', edge: '#26345e', mist: '#8fa3d6', ink: '#e8eeff',
        cyan: { DEFAULT: '#3ff0e0', dim: '#1b9c93' }, amber: { DEFAULT: '#ffb547', dim: '#a8701e' }, crimson: { DEFAULT: '#ff4d6d', dim: '#9c2740' },
        violet: { DEFAULT: '#a77bff' }, lime: { DEFAULT: '#8dff7a' },
      },
      fontFamily: { display: ['"Chakra Petch"', 'Exo 2', 'system-ui', 'sans-serif'], body: ['"Exo 2"', 'system-ui', 'sans-serif'] },
      boxShadow: { glow: '0 0 0 1px rgba(63,240,224,.35), 0 0 24px rgba(63,240,224,.25)', panel: '0 18px 50px rgba(0,0,0,.45)' },
    },
  },
  plugins: [],
};
