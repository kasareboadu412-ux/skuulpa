"use client";

import { useEffect, useState } from "react";
import {
  Ellipsis,
  Heart,
  Phone,
  Star,
  AlertTriangle,
  MessageCircle,
  HelpCircle,
  School,
  User,
  Shield,
  Mail,
  MapPin,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  admission_number: string | null;
  dob: string | null;
  medical_info: {
    allergies?: string;
    blood_group?: string;
    conditions?: string;
    emergency_contacts?: {
      name: string;
      phone: string;
      relationship: string;
    }[];
  };
  class: { name: string; school: { name: string; phone: string | null; email: string | null; address: string | null } } | { name: string; school: { name: string; phone: string | null; email: string | null; address: string | null } }[] | null;
}

interface BehaviorLog {
  id: string;
  type: string | null;
  description: string | null;
  date: string;
  shared_with_parent: boolean;
  teacher: { first_name: string; last_name: string } | null;
}

interface BehaviorSummary {
  stars: number;
  warnings: number;
  incidents: number;
}

export default function MorePage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [behaviorLogs, setBehaviorLogs] = useState<BehaviorLog[]>([]);
  const [behaviorSummary, setBehaviorSummary] = useState<BehaviorSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch("/api/parent/students");
        const data = await res.json();
        if (data.students?.length > 0) {
          setStudents(data.students);
          setSelectedStudentId(data.students[0].id);
        }
      } catch {
        toast.error("Failed to load students");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (!selectedStudentId) return;
    async function fetchBehavior() {
      setLoading(true);
      try {
        const res = await fetch(`/api/parent/behavior?studentId=${selectedStudentId}`);
        if (!res.ok) throw new Error("Failed to load behavior data");
        const data = await res.json();
        setBehaviorLogs(data.behaviorLogs || []);
        setBehaviorSummary(data.summary || null);
      } catch {
        toast.error("Failed to load behavior information");
      } finally {
        setLoading(false);
      }
    }
    fetchBehavior();
  }, [selectedStudentId]);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);
  const cls = selectedStudent?.class
    ? Array.isArray(selectedStudent.class)
      ? selectedStudent.class[0]
      : selectedStudent.class
    : null;
  const school = cls?.school || null;
  const medical = selectedStudent?.medical_info || {};

  if (loading && !selectedStudent) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Ellipsis className="h-6 w-6 text-blue-600" />
        <div>
          <h1 className="text-lg font-bold">More</h1>
          {selectedStudent && (
            <p className="text-xs text-muted-foreground">
              {selectedStudent.first_name} {selectedStudent.last_name}
            </p>
          )}
        </div>
      </div>

      {/* Student Info */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="h-7 w-7 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold">
                {selectedStudent?.first_name} {selectedStudent?.last_name}
              </p>
              <p className="text-xs text-muted-foreground">
                {cls?.name || "No class"}
              </p>
              {selectedStudent?.admission_number && (
                <p className="text-xs text-muted-foreground">
                  ID: {selectedStudent.admission_number}
                </p>
              )}
              {selectedStudent?.dob && (
                <p className="text-xs text-muted-foreground">
                  DOB: {formatDate(selectedStudent.dob)}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Medical Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Heart className="h-4 w-4 text-red-500" />
            Medical Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(medical).length === 0 ||
          (!medical.allergies && !medical.blood_group && !medical.conditions) ? (
            <p className="text-sm text-muted-foreground">
              No medical information shared by the school
            </p>
          ) : (
            <div className="space-y-2 text-sm">
              {medical.blood_group && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Blood Group</span>
                  <span className="font-medium">{medical.blood_group}</span>
                </div>
              )}
              {medical.allergies && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Allergies</span>
                  <span className="font-medium">{medical.allergies}</span>
                </div>
              )}
              {medical.conditions && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Conditions</span>
                  <span className="font-medium">{medical.conditions}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Emergency Contacts */}
      {medical.emergency_contacts && medical.emergency_contacts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Phone className="h-4 w-4 text-green-600" />
              Emergency Contacts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {medical.emergency_contacts.map((contact, i) => (
              <div
                key={i}
                className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-medium">{contact.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {contact.relationship}
                  </p>
                </div>
                <a
                  href={`tel:${contact.phone}`}
                  className="text-sm text-blue-600 font-medium"
                >
                  {contact.phone}
                </a>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Behavior Reports */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4 text-purple-600" />
            Behavior Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Behavior Summary */}
          {behaviorSummary && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center bg-green-50 rounded-lg p-2">
                <Star className="h-5 w-5 text-green-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-green-700">
                  {behaviorSummary.stars}
                </p>
                <p className="text-[10px] text-green-600">Stars</p>
              </div>
              <div className="text-center bg-yellow-50 rounded-lg p-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-yellow-700">
                  {behaviorSummary.warnings}
                </p>
                <p className="text-[10px] text-yellow-600">Warnings</p>
              </div>
              <div className="text-center bg-red-50 rounded-lg p-2">
                <AlertTriangle className="h-5 w-5 text-red-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-red-700">
                  {behaviorSummary.incidents}
                </p>
                <p className="text-[10px] text-red-600">Incidents</p>
              </div>
            </div>
          )}

          {behaviorLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-2">
              No behavior records
            </p>
          ) : (
            <div className="space-y-2">
              {behaviorLogs.slice(0, 10).map((log) => (
                <div
                  key={log.id}
                  className="border rounded-lg p-3 text-sm space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {log.type === "star" ? (
                        <Star className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertTriangle
                          className={`h-4 w-4 ${
                            log.type === "warning"
                              ? "text-yellow-500"
                              : "text-red-500"
                          }`}
                        />
                      )}
                      <span className="font-medium capitalize">{log.type}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(log.date)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {log.description}
                  </p>
                  {log.teacher && (
                    <p className="text-xs text-muted-foreground">
                      By: {log.teacher.first_name} {log.teacher.last_name}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* School Contacts */}
      {school && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <School className="h-4 w-4 text-blue-600" />
              School Contacts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="font-medium text-sm">{school.name}</p>
            {school.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${school.phone}`} className="text-blue-600">
                  {school.phone}
                </a>
              </div>
            )}
            {school.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${school.email}`} className="text-blue-600">
                  {school.email}
                </a>
              </div>
            )}
            {school.address && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{school.address}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Support */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-gray-600" />
            Support
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Need help with the parent portal? Contact the school office or reach
            out to our support team.
          </p>
          <div className="flex gap-2">
            {school?.phone && (
              <a
                href={`https://wa.me/${school.phone.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button variant="outline" size="sm" className="gap-1 text-xs w-full">
                  <MessageCircle className="h-3 w-3" />
                  WhatsApp Support
                </Button>
              </a>
            )}
            {school?.email && (
              <a href={`mailto:${school.email}`} className="flex-1">
                <Button variant="outline" size="sm" className="gap-1 text-xs w-full">
                  <Mail className="h-3 w-3" />
                  Email Support
                </Button>
              </a>
            )}
            {!school?.phone && !school?.email && (
              <p className="text-xs text-muted-foreground">
                School contact details not configured yet.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
