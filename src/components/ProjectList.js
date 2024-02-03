import React, { useState, useEffect } from 'react';
import ProjectDetail from './ProjectDetail';
import { auth, db } from '../firebase';
import { collection, query, getDocs, doc, getDoc, updateDoc, increment, arrayUnion, setDoc } from 'firebase/firestore';
import '../styles/ProjectList.css'

function timeAgo(date) {
    const now = new Date();
    const seconds = Math.round((now - date) / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);
    const weeks = Math.round(days / 7);
    const months = Math.round(days / 30);
    const years = Math.round(days / 365);

    if (seconds < 60) {
        return `${seconds}초 전`;
    } else if (minutes < 60) {
        return `${minutes}분 전`;
    } else if (hours < 24) {
        return `${hours}시간 전`;
    } else if (days < 7) {
        return `${days}일 전`;
    } else if (weeks < 5) {
        return `${weeks}주 전`;
    } else if (months < 12) {
        return `${months}달 전`;
    } else {
        return `${years}년 전`;
    }
}

function ProjectList({ isBookmarkPage, projectsData, setRefreshTrigger }) {

    const [showPopup, setShowPopup] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);
    const [projects, setProjects] = useState([]);
    const [reloadTrigger, setReloadTrigger] = useState(false);


    const incrementViews = async (projectId) => {
        const userId = auth.currentUser ? auth.currentUser.uid : null;
        if (!userId) return;

        const userViewsRef = doc(db, "userViews", userId);
        const userViewsDoc = await getDoc(userViewsRef);

        if (userViewsDoc.exists()) {
            const viewedProjects = userViewsDoc.data().viewedProjects || [];
            if (!viewedProjects.includes(projectId)) {
                await updateDoc(userViewsRef, {
                    viewedProjects: arrayUnion(projectId)
                });
                const projectRef = doc(db, "projects", projectId);
                await updateDoc(projectRef, {
                    views: increment(1)
                });
            }
        } else {
            await setDoc(userViewsRef, {
                viewedProjects: [projectId]
            });
            const projectRef = doc(db, "projects", projectId);
            await updateDoc(projectRef, {
                views: increment(1)
            });
        }
    };

    const fetchProjects = async () => {
        const projectCollection = collection(db, "projects");
        const projectQuery = query(projectCollection);

        try {
            const projectSnapshot = await getDocs(projectQuery);
            const projectData = [];

            for (const docRef of projectSnapshot.docs) {
                const projectInfo = docRef.data();
                const authorDocRef = doc(db, "users", projectInfo.userId);

                const authorDocSnapshot = await getDoc(authorDocRef);

                projectInfo.views = docRef.data().views || 0;
                projectInfo.relativeDate = timeAgo(projectInfo.createdAt.toDate());

                if (authorDocSnapshot.exists()) {
                    const authorInfo = authorDocSnapshot.data();
                    projectInfo.authorName = authorInfo.displayName;
                }

                projectData.push({
                    id: docRef.id,
                    ...projectInfo
                });
            }

            projectData.sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate());

            setProjects(projectData);
        } catch (error) {
            console.error("프로젝트 데이터 가져오기 에러:", error);
        }
    };

    useEffect(() => {
        if (isBookmarkPage) {
            setProjects(projectsData);
        } else {
            fetchProjects();
        }
    }, [isBookmarkPage, projectsData, reloadTrigger]);

    const showProjectDetail = (projectId) => {
        setSelectedProject(projectId);
        setShowPopup(true);
        incrementViews(projectId);
    };

    return (
        <div className="projectList">
            {projects.map(project => (
                <div key={project.id} className="projectDiv" onClick={() => showProjectDetail(project.id)}>
                    <div className="projectThumbnail">
                        {project.imageUrls && project.imageUrls.length > 0 && (
                            <img src={project.imageUrls[0]} alt={`${project.title} 프로젝트 썸네일`} />
                        )}
                    </div>
                    <div className='info'>
                        <div className="projectTitle">{project.title}</div>
                        <div className="projectAuthor">{project.authorName}</div>
                        <div className="projectStats">
                            <span className="projectViews">조회수 {project.views}회 •</span>
                            <span className="projectCreatedAt">&nbsp;{project.relativeDate}</span>
                        </div>
                    </div>
                </div>
            ))}

            {showPopup && (
                <ProjectDetail
                    projectId={selectedProject}
                    setShowPopup={setShowPopup}
                    onPopupClose={() => setReloadTrigger(prev => !prev)}
                    OPCBookmarks={() => setRefreshTrigger(prev => !prev)}
                />
            )}
        </div>
    );
}

export default ProjectList;