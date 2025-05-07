// c:\Users\scubo\Downloads\FinClassify-dea0c4be4da0318ed62b8b3aa713817c40b0002f\FinClassifyApp\app\context\DateContext.tsx
import React, {
  createContext,
  ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";

// Define the type for the filter
export type TimeFilter = "Daily" | "Weekly" | "Monthly";

// Define the shape of the context data including the filter
interface DateContextType {
  // Renamed interface for clarity
  selectedYear: number;
  selectedMonth: string; // e.g., "Jan", "Feb"
  selectedFilter: TimeFilter; // Add filter state
  setSelectedYear: (year: number) => void;
  setSelectedMonth: (month: string) => void;
  setSelectedFilter: (filter: TimeFilter) => void; // Add filter setter
  selectedCurrency: string; // <-- Add selectedCurrency
  setSelectedCurrency: (currency: string) => void; // <-- Add setter for currency
  selectedDateString: string; // Formatted string like "Jan 2024"
  startDate: Date; // Add startDate
  setStartDate: (date: Date) => void; // Add setter for startDate
  endDate: Date; // Add endDate
  setEndDate: (date: Date) => void; // Add setter for endDate
  updateDateRange: (start: Date, end: Date) => void; // Add updateDateRange
}

// Create the context with a default value matching the interface
const DateContext = createContext<DateContextType>({
  selectedYear: new Date().getFullYear(),
  selectedMonth: new Date().toLocaleString("default", { month: "short" }),
  selectedFilter: "Monthly", // Default filter
  setSelectedYear: () => {},
  setSelectedMonth: () => {},
  selectedCurrency: "PHP", // Default currency
  setSelectedCurrency: () => {},
  setSelectedFilter: () => {},
  selectedDateString: `${new Date().toLocaleString("default", {
    month: "short",
  })} ${new Date().getFullYear()}`,
  startDate: new Date(), // Default startDate
  setStartDate: () => {}, // Default setter for startDate
  endDate: new Date(), // Default endDate
  setEndDate: () => {}, // Default setter for endDate
  updateDateRange: () => {}, // Default updateDateRange
});

// Create the provider component
export const DateProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const currentMonthName = new Date().toLocaleString("default", {
    month: "short",
  });
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentMonthName);
  const [selectedFilter, setSelectedFilter] = useState<TimeFilter>("Monthly"); // Add filter state
  const [selectedCurrency, setSelectedCurrency] = useState<string>("PHP"); // <-- Add currency state
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1); // First day of current month
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of current month
  });

  const updateDateRange = (start: Date, end: Date) => {
    setStartDate(new Date(start.setHours(0, 0, 0, 0)));
    setEndDate(new Date(end.setHours(23, 59, 59, 999)));
  };

  // Memoize the formatted date string to prevent unnecessary recalculations
  const selectedDateString = useMemo(() => {
    return `${selectedMonth} ${selectedYear}`;
  }, [selectedMonth, selectedYear]);

  // Memoize the context value including filter state and setter
  const value = useMemo(
    () => ({
      selectedYear,
      selectedMonth,
      setSelectedYear,
      setSelectedMonth,
      selectedDateString,
      selectedFilter, // Provide filter state
      setSelectedFilter, // Provide filter setter
      selectedCurrency, // <-- Provide currency state
      setSelectedCurrency, // <-- Provide currency setter
      startDate, // Provide startDate
      setStartDate, // Provide setter for startDate
      endDate, // Provide endDate
      setEndDate, // Provide setter for endDate
      updateDateRange, // Provide updateDateRange
    }),
    [
      selectedYear,
      selectedMonth,
      selectedDateString,
      selectedFilter,
      selectedCurrency, // <-- Add currency to dependencies
      startDate, // Add startDate to dependencies
      endDate, // Add endDate to dependencies
    ]
  );

  return <DateContext.Provider value={value}>{children}</DateContext.Provider>;
};

// Custom hook to use the DateContext
export const useDateContext = () => {
  const context = useContext(DateContext);
  if (context === undefined) {
    throw new Error("useDateContext must be used within a DateProvider");
  }
  return context;
};
