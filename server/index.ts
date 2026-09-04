import app from './app';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`GPA Calculator Server running on port ${PORT}`);
});

export default app;
