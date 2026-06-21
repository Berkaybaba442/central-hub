package com.berkayhub.club;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;

@Entity
@Table(name = "team_assignments")
public class TeamAssignment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @NotBlank @Column(nullable = false)
    private String memberName;
    @NotBlank @Column(nullable = false)
    private String teamName;
    @NotBlank @Column(nullable = false)
    private String responsibility;

    public TeamAssignment() {}
    public TeamAssignment(String memberName, String teamName, String responsibility) {
        this.memberName = memberName;
        this.teamName = teamName;
        this.responsibility = responsibility;
    }
    public Long getId() { return id; }
    public String getMemberName() { return memberName; }
    public void setMemberName(String memberName) { this.memberName = memberName; }
    public String getTeamName() { return teamName; }
    public void setTeamName(String teamName) { this.teamName = teamName; }
    public String getResponsibility() { return responsibility; }
    public void setResponsibility(String responsibility) { this.responsibility = responsibility; }
}
