import { addDays, format, isBefore } from "date-fns";
import React from "react";
import {
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Calendar, DateData } from "react-native-calendars";

interface CalendarRangeModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (startDate: Date, endDate: Date) => void;
  startDate: Date;
  endDate: Date;
}

const CalendarRangeModal: React.FC<CalendarRangeModalProps> = ({
  visible,
  onClose,
  onSelect,
  startDate,
  endDate,
}) => {
  const [tempStartDate, setTempStartDate] = React.useState<string>("");
  const [tempEndDate, setTempEndDate] = React.useState<string>("");
  const [isSelectingEnd, setIsSelectingEnd] = React.useState(false);

  React.useEffect(() => {
    if (visible) {
      // Reset selections when modal opens
      setTempStartDate(format(startDate, "yyyy-MM-dd"));
      setTempEndDate(format(endDate, "yyyy-MM-dd"));
      setIsSelectingEnd(false);
    }
  }, [visible, startDate, endDate]);

  const getMarkedDates = () => {
    const markedDates: any = {};

    if (!tempStartDate) return markedDates;

    // Mark start date
    markedDates[tempStartDate] = {
      selected: true,
      startingDay: true,
      color: "#006400",
      textColor: "white",
    };

    // If we have both dates, mark the range
    if (tempEndDate) {
      let currentDate = new Date(tempStartDate);
      const endDate = new Date(tempEndDate);

      while (isBefore(currentDate, endDate)) {
        currentDate = addDays(currentDate, 1);
        const dateString = format(currentDate, "yyyy-MM-dd");

        if (dateString === tempEndDate) {
          markedDates[dateString] = {
            selected: true,
            endingDay: true,
            color: "#006400",
            textColor: "white",
          };
        } else {
          markedDates[dateString] = {
            selected: true,
            color: "#E8F5E9",
            textColor: "#006400",
          };
        }
      }
    }

    return markedDates;
  };

  const handleDayPress = (day: DateData) => {
    if (!isSelectingEnd) {
      // Selecting start date
      setTempStartDate(day.dateString);
      setTempEndDate("");
      setIsSelectingEnd(true);
    } else {
      // Selecting end date
      const selectedDate = new Date(day.dateString);
      const start = new Date(tempStartDate);

      if (isBefore(selectedDate, start)) {
        // If selected date is before start date, swap them
        setTempEndDate(tempStartDate);
        setTempStartDate(day.dateString);
      } else {
        setTempEndDate(day.dateString);
      }
      setIsSelectingEnd(false);
    }
  };

  const handleConfirm = () => {
    if (tempStartDate && tempEndDate) {
      onSelect(new Date(tempStartDate), new Date(tempEndDate));
      onClose();
    }
  };

  const isConfirmDisabled = !tempStartDate || !tempEndDate;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>
            {isSelectingEnd ? "Select End Date" : "Select Start Date"}
          </Text>
          <Calendar
            onDayPress={handleDayPress}
            markedDates={getMarkedDates()}
            markingType="period"
            theme={{
              todayTextColor: "#006400",
              selectedDayBackgroundColor: "#006400",
              selectedDayTextColor: "#ffffff",
              arrowColor: "#006400",
              dotColor: "#006400",
              selectedDotColor: "#ffffff",
            }}
          />
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={onClose}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.confirmButton,
                isConfirmDisabled && styles.disabledButton,
              ]}
              onPress={handleConfirm}
              disabled={isConfirmDisabled}
            >
              <Text
                style={[
                  styles.buttonText,
                  styles.confirmButtonText,
                  isConfirmDisabled && styles.disabledButtonText,
                ]}
              >
                Confirm
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    width: Dimensions.get("window").width * 0.9,
    maxHeight: Dimensions.get("window").height * 0.8,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#006400",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    gap: 10,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
  },
  confirmButton: {
    backgroundColor: "#006400",
  },
  disabledButton: {
    backgroundColor: "#cccccc",
  },
  buttonText: {
    fontSize: 16,
    color: "#444",
    fontWeight: "600",
  },
  confirmButtonText: {
    color: "white",
  },
  disabledButtonText: {
    color: "#888888",
  },
});

export default CalendarRangeModal;
