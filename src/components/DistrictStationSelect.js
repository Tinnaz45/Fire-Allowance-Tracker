// src/components/DistrictStationSelect.js
import React, { useState, useEffect } from 'react';
import { DISTRICTS, getDistrictForStation, getStationsForDistrict } from '../data/stations';

// Props:
//   label      - string, e.g. "Station", "Rostered station", "Recall station"
//   stationId  - controlled value (number or '')
//   onChange   - callback(newStationId: number | '')
export default function DistrictStationSelect({ label = 'Station', stationId, onChange }) {
  const [district, setDistrict] = useState(() =>
    stationId ? (getDistrictForStation(stationId) || '') : ''
  );

  // Sync district when stationId changes externally (e.g. profile pre-fill on load)
  useEffect(() => {
    if (stationId) {
      const d = getDistrictForStation(stationId);
      if (d && d !== district) setDistrict(d);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stationId]);

  const filteredStations = district ? getStationsForDistrict(district) : [];

  function handleDistrictChange(e) {
    const newDistrict = e.target.value;
    setDistrict(newDistrict);
    // Keep station if it belongs to the new district, otherwise reset
    if (stationId && getDistrictForStation(stationId) !== newDistrict) {
      onChange('');
    }
  }

  function handleStationChange(e) {
    const val = e.target.value;
    onChange(val === '' ? '' : Number(val));
  }

  const districtLabel = label === 'Station' ? 'District' : `${label} district`;

  return (
    <>
      <div className="form-group">
        <label>{districtLabel}</label>
        <div className="select-wrapper">
          <select value={district} onChange={handleDistrictChange}>
            <option value="">Select district…</option>
            {DISTRICTS.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label>{label}</label>
        <div className="select-wrapper">
          <select
            value={stationId || ''}
            onChange={handleStationChange}
            disabled={!district}
          >
            <option value="">
              {district ? 'Select station…' : 'Select district first…'}
            </option>
            {filteredStations.map(s => (
              <option key={s.id} value={s.id}>
                {s.id} — {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
}
