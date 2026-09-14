import app from './app';

const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`GPA Calculator Server running on port ${PORT}`);
});

export default app;
