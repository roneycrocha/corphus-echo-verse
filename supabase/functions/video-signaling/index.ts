import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

interface Message {
  type: string;
  [key: string]: any;
}

interface Connection {
  socket: WebSocket;
  role: 'doctor' | 'patient';
  patient: string;
  id: string;
}

const connections = new Map<string, Connection>();

serve(async (req) => {
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  const connectionId = crypto.randomUUID();

  socket.onopen = () => {
    console.log(`Connection opened: ${connectionId}`);
  };

  socket.onmessage = (event) => {
    try {
      const message: Message = JSON.parse(event.data);
      handleMessage(connectionId, message, socket);
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  };

  socket.onclose = () => {
    console.log(`Connection closed: ${connectionId}`);
    handleDisconnection(connectionId);
  };

  socket.onerror = (error) => {
    console.error(`WebSocket error for ${connectionId}:`, error);
    handleDisconnection(connectionId);
  };

  return response;
});

function handleMessage(connectionId: string, message: Message, socket: WebSocket) {
  const { type } = message;

  switch (type) {
    case 'register':
      handleRegister(connectionId, message, socket);
      break;
    
    case 'offer':
    case 'answer':
    case 'ice-candidate':
      forwardSignalingMessage(connectionId, message);
      break;
    
    default:
      console.log(`Unknown message type: ${type}`);
  }
}

function handleRegister(connectionId: string, message: Message, socket: WebSocket) {
  const { role, patient } = message;
  
  const connection: Connection = {
    socket,
    role,
    patient,
    id: connectionId
  };
  
  connections.set(connectionId, connection);
  console.log(`Registered ${role} for patient ${patient}`);

  // Se é um paciente se conectando, notificar o doutor
  if (role === 'patient') {
    const doctorConnection = findDoctorForPatient(patient);
    if (doctorConnection) {
      doctorConnection.socket.send(JSON.stringify({
        type: 'patient-joined',
        patient: patient
      }));
    }
  }

  // Se é um doutor se conectando e já existe um paciente, notificar ambos
  if (role === 'doctor') {
    const patientConnection = findPatientForDoctor(patient);
    if (patientConnection) {
      socket.send(JSON.stringify({
        type: 'patient-joined',
        patient: patient
      }));
    }
  }
}

function forwardSignalingMessage(senderConnectionId: string, message: Message) {
  const senderConnection = connections.get(senderConnectionId);
  if (!senderConnection) return;

  const { patient, role } = senderConnection;
  
  // Encontrar a conexão do destinatário
  let targetConnection: Connection | undefined;
  
  if (role === 'doctor') {
    targetConnection = findPatientForDoctor(patient);
  } else if (role === 'patient') {
    targetConnection = findDoctorForPatient(patient);
  }

  if (targetConnection) {
    targetConnection.socket.send(JSON.stringify(message));
  }
}

function findDoctorForPatient(patient: string): Connection | undefined {
  for (const connection of connections.values()) {
    if (connection.role === 'doctor' && connection.patient === patient) {
      return connection;
    }
  }
  return undefined;
}

function findPatientForDoctor(patient: string): Connection | undefined {
  for (const connection of connections.values()) {
    if (connection.role === 'patient' && connection.patient === patient) {
      return connection;
    }
  }
  return undefined;
}

function handleDisconnection(connectionId: string) {
  const connection = connections.get(connectionId);
  if (!connection) return;

  const { patient, role } = connection;
  
  // Notificar a outra parte sobre a desconexão
  let targetConnection: Connection | undefined;
  
  if (role === 'doctor') {
    targetConnection = findPatientForDoctor(patient);
  } else if (role === 'patient') {
    targetConnection = findDoctorForPatient(patient);
  }

  if (targetConnection) {
    targetConnection.socket.send(JSON.stringify({
      type: role === 'doctor' ? 'doctor-left' : 'patient-left',
      patient: patient
    }));
  }

  connections.delete(connectionId);
  console.log(`Removed connection: ${connectionId}`);
}