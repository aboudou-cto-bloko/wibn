export async function queryWithRetry<T>(
  queryFn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000,
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await queryFn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      console.log(`Query failed, retrying (${i + 1}/${maxRetries})...`);
      await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
    }
  }

  throw new Error("Query failed after retries");
}
