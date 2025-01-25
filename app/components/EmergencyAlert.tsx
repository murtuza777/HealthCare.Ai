'use client';

import { motion } from 'framer-motion';
import { FaExclamationTriangle, FaPhone } from 'react-icons/fa';
import { EMERGENCY_INSTRUCTIONS } from '../utils/healthUtils';

interface EmergencyAlertProps {
  onCallEmergency: () => void;
  onCallDoctor: () => void;
}

export default function EmergencyAlert({ onCallEmergency, onCallDoctor }: EmergencyAlertProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg space-y-4"
    >
      <div className="flex items-center space-x-2">
        <FaExclamationTriangle className="text-red-500 w-6 h-6" />
        <h3 className="text-lg font-semibold text-red-700">Emergency Alert</h3>
      </div>

      <div className="text-red-700 whitespace-pre-line">
        {EMERGENCY_INSTRUCTIONS}
      </div>

      <div className="flex space-x-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onCallEmergency}
          className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg 
                   hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          <FaPhone />
          <span>Call Emergency (911)</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onCallDoctor}
          className="flex items-center space-x-2 px-4 py-2 bg-white text-red-600 border border-red-600 
                   rounded-lg hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          <FaPhone />
          <span>Call Doctor</span>
        </motion.button>
      </div>
    </motion.div>
  );
}
