import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { Hospital, Request, Case } from '../../types/domain';
import { getFreshness } from '../../utils/time';
import clsx from 'clsx';

// Fix default Leaflet icon paths in React
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface RadianceMapProps {
  hospitals: Hospital[];
  activeRequest?: Request | null;
  activeCase?: Case | null;
  className?: string;
}

export const RadianceMap: React.FC<RadianceMapProps> = ({
  hospitals,
  activeRequest,
  activeCase,
  className,
}) => {
  // Center roughly around Ahmedabad / hospital cluster
  const centerLat = 23.128;
  const centerLng = 72.545;

  const targetHospital = activeRequest
    ? hospitals.find((h) => h.id === activeRequest.hospital_id)
    : null;

  return (
    <div className={clsx('relative w-full h-[460px] rounded-3xl border border-[#E8E2D9] overflow-hidden shadow-sm bg-[#FAF8F5]', className)}>
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={13}
        scrollWheelZoom={false}
        className="w-full h-full z-10"
      >
        {/* OpenStreetMap Clean Daylight Tile Layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Hospitals Capability Radiance Nodes */}
        {hospitals.map((hosp) => {
          const { status: freshnessStatus } = getFreshness(hosp.last_updated_at);
          const isRequested = activeRequest?.hospital_id === hosp.id;
          const isAccepted = isRequested && activeRequest?.status === 'accepted';

          // Radiance calculation: 250m to 700m radius based on capability / score
          const radianceRadius = isRequested
            ? 700
            : 300 + hosp.icu_beds_free * 40;

          const radianceColor = isAccepted
            ? '#52796F'
            : isRequested
            ? '#EA580C'
            : freshnessStatus === 'unknown'
            ? '#A89F97'
            : '#2DD4BF';

          // Custom High-Def Pin
          const customIcon = L.divIcon({
            className: 'custom-hospital-marker',
            html: `
              <div style="
                width: 28px;
                height: 28px;
                border-radius: 8px;
                background: #FFFFFF;
                border: 2px ${freshnessStatus === 'unknown' ? 'dotted' : freshnessStatus === 'stale' ? 'dashed' : 'solid'} ${radianceColor};
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: 'JetBrains Mono', monospace;
                font-size: 11px;
                font-weight: 800;
                color: ${radianceColor};
                box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
              ">
                H
              </div>
            `,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });

          return (
            <React.Fragment key={hosp.id}>
              {/* Radiance Halo Circle */}
              <Circle
                center={[hosp.lat, hosp.lng]}
                radius={radianceRadius}
                pathOptions={{
                  color: radianceColor,
                  fillColor: radianceColor,
                  fillOpacity: isRequested ? 0.25 : 0.10,
                  weight: isRequested ? 2.5 : 1.2,
                  dashArray: freshnessStatus === 'unknown' ? '4, 4' : undefined,
                }}
              />

              {/* Node Marker */}
              <Marker position={[hosp.lat, hosp.lng]} icon={customIcon}>
                <Popup className="font-sans text-xs">
                  <div className="p-1 space-y-1">
                    <div className="font-black text-[#2D231C]">{hosp.name}</div>
                    <div className="font-mono font-bold text-[#7D7067]">
                      ICU Free: <span className="text-[#2D231C]">{hosp.icu_beds_free}</span> • Vents: <span className="text-[#2D231C]">{hosp.ventilators_free}</span>
                    </div>
                    <div className="font-mono font-bold text-[#C2410C]">
                      Reliability: {Math.round(hosp.reliability_score * 100)}%
                    </div>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}

        {/* Active Ambulance Marker */}
        {activeCase && (
          <Marker
            position={[activeCase.ambulance_location.lat, activeCase.ambulance_location.lng]}
            icon={L.divIcon({
              className: 'custom-amb-marker',
              html: `
                <div style="
                  width: 32px;
                  height: 32px;
                  border-radius: 50%;
                  background: #EA580C;
                  border: 2px solid #FFFFFF;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-family: 'JetBrains Mono', monospace;
                  font-size: 10px;
                  font-weight: 800;
                  color: #FFFFFF;
                  box-shadow: 0 4px 16px rgba(20, 155, 158, 0.4);
                ">
                  AMB
                </div>
              `,
              iconSize: [32, 32],
              iconAnchor: [16, 16],
            })}
          >
            <Popup>
              <div className="font-mono text-xs font-bold text-[#2D231C]">
                Ambulance Dispatch • Case {activeCase.id}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Live Commitment Circuit Vector Line between Ambulance and Requested Hospital */}
        {activeCase && targetHospital && (
          <Polyline
            positions={[
              [activeCase.ambulance_location.lat, activeCase.ambulance_location.lng],
              [targetHospital.lat, targetHospital.lng],
            ]}
            pathOptions={{
              color: activeRequest?.status === 'accepted' ? '#52796F' : '#EA580C',
              weight: activeRequest?.status === 'accepted' ? 4 : 2.5,
              dashArray: activeRequest?.status === 'accepted' ? undefined : '6, 8',
              opacity: 0.9,
            }}
          />
        )}
      </MapContainer>

      {/* Map Legend & Radiance Explanation Overlay */}
      <div className="absolute top-4 right-4 z-20 bg-white/95 border border-[#E8E2D9] p-4 rounded-2xl text-[11px] font-mono font-semibold text-[#7D7067] space-y-1.5 backdrop-blur-md pointer-events-none select-none shadow-sm">
        <div className="text-[10px] uppercase font-black text-[#2D231C] tracking-wider mb-1">
          Capability Radiance:
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#EA580C]" />
          <span>Teal: In-flight candidate vector</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#52796F]" />
          <span>Mint: Locked commitment hold</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2DD4BF]" />
          <span>Cyan: Regional hospital ready</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full border border-dashed border-[#A89F97]" />
          <span>Dashed: Stale / de-weighted</span>
        </div>
      </div>
    </div>
  );
};
